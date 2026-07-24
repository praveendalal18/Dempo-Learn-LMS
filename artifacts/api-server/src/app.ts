import path from "path";
import express, { type Express } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { logActivity } from "./lib/activityLog";

const app: Express = express();

// Behind Vercel's proxy: trust one hop so req.ip is the real client (used by
// the rate limiter and logging), without trusting arbitrary X-Forwarded-For.
app.set("trust proxy", 1);

// Security headers (HSTS, X-Content-Type-Options, frameguard, etc.). CSP is
// left off here: this process serves a JSON API, and the SPA is served by the
// Vercel CDN (not Express) in production, so a CSP set here would not cover it.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }),
);

// Baseline abuse ceiling on the API. NOTE: on Vercel serverless the default
// store is per-instance (a determined attacker across many warm instances can
// exceed this) — adequate for single-college traffic; move to a shared store
// (Upstash Redis) if this scales to many concurrent instances.
const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 240, // ~4 req/sec per client per instance
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});
// Tighter ceiling on the expensive, paid-API / heavy-compute write paths
// (AI grading + O(n^2) similarity on submissions/quiz attempts).
const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many submissions in a short time, please wait." },
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// Restrict credentialed CORS to configured web origins (CORS_ALLOWED_ORIGINS
// or APP_BASE_URL, comma-separated). If none are configured, allow any origin
// only in non-production (dev convenience) but never in production.
const corsOrigins = (
  process.env.CORS_ALLOWED_ORIGINS ||
  process.env.APP_BASE_URL ||
  ""
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    credentials: true,
    origin:
      corsOrigins.length > 0
        ? corsOrigins
        : process.env.NODE_ENV === "production"
          ? false
          : true,
  }),
);
app.use(express.json({ limit: "512kb" }));
app.use(express.urlencoded({ extended: true, limit: "512kb" }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

// Tighter limit on the expensive write paths, then the baseline limit on the
// rest of the API.
app.use("/api/assignments/:assignmentId/submissions", writeLimiter);
app.use("/api/quizzes/:quizId/attempts", writeLimiter);
app.use("/api", apiLimiter);
app.use("/api", router);

// Single-origin production: serve the built web app for non-API GET routes so
// the SPA and API share one host (relative /api calls + Clerk cookies just
// work). Enabled by setting WEB_DIST_DIR to the built web output (dist/public);
// left unset in local dev, where Vite serves the web app separately.
const webDistDir = process.env.WEB_DIST_DIR;
if (webDistDir) {
  const absoluteWebDir = path.resolve(webDistDir);
  app.use(express.static(absoluteWebDir));
  // SPA fallback: send index.html for client-side routes (never for /api).
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(absoluteWebDir, "index.html"));
  });
}

// Central error handler: record unexpected API errors in the activity log.
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    req.log?.error({ err }, "Unhandled API error");
    void logActivity({
      user: req.localUser ?? null,
      level: "error",
      action: "api.error",
      message: `Unhandled error on ${req.method} ${req.path}: ${err.message}`,
      metadata: { method: req.method, path: req.path },
    });
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default app;
