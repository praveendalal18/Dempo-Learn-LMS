import path from "path";
import express, { type Express } from "express";
import helmet from "helmet";
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

// Security headers (HSTS, X-Content-Type-Options, frameguard, etc.). CSP is
// left off here: this process serves a JSON API, and the SPA is served by the
// Vercel CDN (not Express) in production, so a CSP set here would not cover it.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

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
