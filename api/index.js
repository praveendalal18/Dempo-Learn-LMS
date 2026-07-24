// Vercel serverless entry for the Dempo API.
//
// Imports the PREBUILT, self-contained Express app bundle (produced by the
// api-server esbuild build → dist/app.mjs). Using the compiled JS — not the TS
// source — avoids Vercel type-checking the whole server under its own stricter
// module resolution, and mirrors what runs on the current server deploy.
//
// Vercel routes only /api/* here (see vercel.json); the SPA is static on the CDN.
import app from "../artifacts/api-server/dist/app.mjs";

export default app;
