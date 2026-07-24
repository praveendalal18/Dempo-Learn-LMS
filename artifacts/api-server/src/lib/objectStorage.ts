import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import {
  AclCapableObject,
  canAccessObject,
  ObjectAclPolicy,
  ObjectPermission,
} from './objectAcl';

// -----------------------------------------------------------------------------
// S3-compatible object storage (DigitalOcean Spaces / AWS S3 / Cloudflare R2 /
// MinIO). Replaces the Replit App Storage sidecar. All buckets/keys live in one
// bucket (STORAGE_BUCKET); the app-facing path for a private object stays
// "/objects/<entityId>" so nothing else in the app needs to change.
// -----------------------------------------------------------------------------

// S3 user-metadata keys must be valid HTTP header tokens, so we cannot use the
// old "custom:aclPolicy" (":" is illegal). S3 also lowercases metadata keys.
const ACL_METADATA_KEY = 'aclpolicy';

const UPLOAD_URL_TTL_SEC = 900;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} must be set. Did you forget to configure object storage? ` +
        `See ARCHITECTURE.md §16.`,
    );
  }
  return value;
}

/** Whether an AWS SDK error represents a missing object / 404. */
function isNotFoundError(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    e?.name === 'NotFound' ||
    e?.name === 'NoSuchKey' ||
    e?.$metadata?.httpStatusCode === 404
  );
}

let sharedClient: S3Client | null = null;
function getClient(): S3Client {
  if (sharedClient) return sharedClient;
  sharedClient = new S3Client({
    region: process.env.STORAGE_REGION || 'us-east-1',
    endpoint: requireEnv('STORAGE_ENDPOINT'),
    credentials: {
      accessKeyId: requireEnv('STORAGE_ACCESS_KEY'),
      secretAccessKey: requireEnv('STORAGE_SECRET_KEY'),
    },
    // DO Spaces / AWS use virtual-hosted-style by default; MinIO needs path
    // style. Toggle with STORAGE_FORCE_PATH_STYLE=true.
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === 'true',
  });
  return sharedClient;
}

function getBucket(): string {
  return requireEnv('STORAGE_BUCKET');
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super('Object not found');
    this.name = 'ObjectNotFoundError';
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

/**
 * A handle to a single object in the bucket. Wraps the S3 operations the app
 * needs and satisfies AclCapableObject so objectAcl.ts stays storage-agnostic.
 */
export class StoredObject implements AclCapableObject {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
    public readonly key: string,
  ) {}

  get name(): string {
    return this.key;
  }

  async exists(): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: this.key }),
      );
      return true;
    } catch (err) {
      if (isNotFoundError(err)) return false;
      throw err;
    }
  }

  async getAclPolicy(): Promise<ObjectAclPolicy | null> {
    try {
      const head = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: this.key }),
      );
      const raw = head.Metadata?.[ACL_METADATA_KEY];
      return raw ? (JSON.parse(raw) as ObjectAclPolicy) : null;
    } catch (err) {
      if (isNotFoundError(err)) return null;
      throw err;
    }
  }

  async setAclPolicy(policy: ObjectAclPolicy): Promise<void> {
    // S3 object metadata is immutable in place — replace it via a self-copy.
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        Key: this.key,
        CopySource: encodeURI(`${this.bucket}/${this.key}`),
        Metadata: { [ACL_METADATA_KEY]: JSON.stringify(policy) },
        MetadataDirective: 'REPLACE',
      }),
    );
  }

  async delete(opts: { ignoreNotFound?: boolean } = {}): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: this.key }),
      );
    } catch (err) {
      if (opts.ignoreNotFound && isNotFoundError(err)) return;
      throw err;
    }
  }

  /** Fetch the object and wrap it in a web Response for streaming to a client. */
  async createDownloadResponse(cacheTtlSec = 3600): Promise<Response> {
    let out;
    try {
      out = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: this.key }),
      );
    } catch (err) {
      if (isNotFoundError(err)) throw new ObjectNotFoundError();
      throw err;
    }

    const rawAcl = out.Metadata?.[ACL_METADATA_KEY];
    const aclPolicy = rawAcl ? (JSON.parse(rawAcl) as ObjectAclPolicy) : null;
    const isPublic = aclPolicy?.visibility === 'public';

    const headers: Record<string, string> = {
      'Content-Type': out.ContentType || 'application/octet-stream',
      'Cache-Control': `${isPublic ? 'public' : 'private'}, max-age=${cacheTtlSec}`,
      // Never let the browser sniff a different type than declared.
      'X-Content-Type-Options': 'nosniff',
    };
    // Private files (submission attachments, course materials) are user-uploaded
    // with an attacker-controlled Content-Type, so force download rather than
    // inline rendering — otherwise an uploaded text/html file would execute as
    // stored XSS in the app origin when a teacher opens it. Public assets
    // (avatars, logos) stay inline so images render.
    if (!isPublic) {
      headers['Content-Disposition'] = 'attachment';
    }
    if (out.ContentLength != null) {
      headers['Content-Length'] = String(out.ContentLength);
    }

    const nodeStream = out.Body as Readable;
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    return new Response(webStream, { headers });
  }
}

export class ObjectStorageService {
  // Lazy: resolve the S3 client (and its required env) only when a storage
  // operation actually runs, so the server can boot without storage configured
  // (e.g. health checks, routes that never touch storage). getClient() memoizes.
  private get client(): S3Client {
    return getClient();
  }

  /** Private-object key prefix within the bucket (e.g. "private"). */
  private getPrivatePrefix(): string {
    return requireEnv('PRIVATE_OBJECT_DIR').replace(/^\/+|\/+$/g, '');
  }

  getPublicObjectSearchPaths(): Array<string> {
    const raw = process.env.PUBLIC_OBJECT_SEARCH_PATHS || '';
    const paths = Array.from(
      new Set(
        raw
          .split(',')
          .map((p) => p.trim().replace(/^\/+|\/+$/g, ''))
          .filter((p) => p.length > 0),
      ),
    );
    if (paths.length === 0) {
      throw new Error(
        'PUBLIC_OBJECT_SEARCH_PATHS not set. Set it to a comma-separated list ' +
          'of public key prefixes within the bucket.',
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    return this.getPrivatePrefix();
  }

  /** Presigned PUT URL the browser uploads to directly (bypasses the API). */
  async getObjectEntityUploadURL(): Promise<string> {
    const entityId = `uploads/${randomUUID()}`;
    const key = `${this.getPrivatePrefix()}/${entityId}`;
    // Sign without ContentType so the browser may send any Content-Type header.
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: getBucket(), Key: key }),
      { expiresIn: UPLOAD_URL_TTL_SEC },
    );
  }

  async searchPublicObject(filePath: string): Promise<StoredObject | null> {
    const bucket = getBucket();
    for (const prefix of this.getPublicObjectSearchPaths()) {
      const obj = new StoredObject(this.client, bucket, `${prefix}/${filePath}`);
      if (await obj.exists()) {
        return obj;
      }
    }
    return null;
  }

  async downloadObject(
    file: StoredObject,
    cacheTtlSec = 3600,
  ): Promise<Response> {
    return file.createDownloadResponse(cacheTtlSec);
  }

  /**
   * Resolve an app-facing "/objects/<entityId>" path to a StoredObject handle.
   * Does not hit the network — a missing object surfaces as ObjectNotFoundError
   * when it is later read or downloaded.
   */
  getObjectEntityFile(objectPath: string): StoredObject {
    if (!objectPath.startsWith('/objects/')) {
      throw new ObjectNotFoundError();
    }
    const entityId = objectPath.slice('/objects/'.length);
    if (!entityId) {
      throw new ObjectNotFoundError();
    }
    const key = `${this.getPrivatePrefix()}/${entityId}`;
    return new StoredObject(this.client, getBucket(), key);
  }

  /**
   * Convert a raw storage URL (e.g. a presigned upload URL) to the app-facing
   * "/objects/<entityId>" path. Non-URL inputs are returned unchanged.
   * Handles both virtual-hosted-style and path-style S3 URLs.
   */
  normalizeObjectEntityPath(rawPath: string): string {
    if (!/^https?:\/\//i.test(rawPath)) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const bucket = getBucket();
    let key = decodeURIComponent(url.pathname).replace(/^\/+/, '');

    if (url.hostname.startsWith(`${bucket}.`)) {
      // virtual-hosted-style: the path is already the key
    } else if (key === bucket || key.startsWith(`${bucket}/`)) {
      // path-style: strip the leading bucket segment
      key = key.slice(bucket.length).replace(/^\/+/, '');
    }

    const prefix = `${this.getPrivatePrefix()}/`;
    if (key.startsWith(prefix)) {
      key = key.slice(prefix.length);
    }

    return `/objects/${key}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith('/objects/')) {
      return normalizedPath;
    }

    const objectFile = this.getObjectEntityFile(normalizedPath);
    if (!(await objectFile.exists())) {
      throw new ObjectNotFoundError();
    }
    await objectFile.setAclPolicy(aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: StoredObject;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}
