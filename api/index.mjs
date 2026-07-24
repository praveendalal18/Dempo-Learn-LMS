// Vercel serverless entry for the Dempo API.
//
// Imports the PREBUILT, self-contained Express app bundle (produced by the
// api-server esbuild build -> dist/app.mjs). Using the compiled JS - not the TS
// source - avoids Vercel type-checking the whole server under its own stricter
// module resolution, and mirrors what runs on the current server deploy.
//
// This file is .mjs on purpose: it forces Vercel to keep the function as ESM
// instead of compiling it to CommonJS. A CJS require() of the ESM app.mjs
// bundle throws ERR_REQUIRE_ESM and crashes the function on load
// (FUNCTION_INVOCATION_FAILED). As native ESM, the import below just works.
//
// Vercel routes only /api/* here (see vercel.json); the SPA is static on the CDN.
import app from "../artifacts/api-server/dist/app.mjs";

export default app;
