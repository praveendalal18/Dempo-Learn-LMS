// Vercel serverless entry for the Dempo API.
//
// The whole Express app (artifacts/api-server) is exported here as the function
// handler. Vercel routes only /api/* to this function (see vercel.json); the
// built React SPA is served as static files by Vercel's CDN. Because app.ts
// mounts the router at "/api" and does NOT call listen(), it drops straight in.
//
// WEB_DIST_DIR is intentionally left UNSET on Vercel so the Express static/SPA
// fallback is skipped — Vercel's CDN owns static serving.
import app from "../artifacts/api-server/src/app";

export default app;
