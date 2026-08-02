// The Quad - Express server. Serves the API and, in production, the built client.
const path = require("path");
const fs = require("fs");
const express = require("express");
const rateLimit = require("express-rate-limit");
const { ready } = require("./db");
const { router: authRouter } = require("./auth");
const apiRouter = require("./api");

const app = express();
const PORT = process.env.PORT || 4000;

// Running behind Vercel's (or any) reverse proxy - trust the forwarded IP so
// the rate limiter below sees real client IPs, not the proxy's.
app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));

// Hardening headers. HTTPS/HSTS is the hosting layer's job (see DEV_HANDOVER).
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

// Make sure the schema exists (and demo data is seeded) before handling any request.
// Memoized in db.js, so this is a no-op after the first request per server instance.
app.use(async (req, res, next) => {
  try {
    await ready();
    next();
  } catch (e) {
    console.error("Database not ready:", e);
    res.status(503).json({ error: "Database unavailable, try again shortly" });
  }
});

// Brute-force protection on login + invite redemption.
app.use("/api/auth", rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Wait a minute and try again." },
}));

app.use("/api/auth", authRouter);
app.use("/api", apiRouter);

// Serve the built client if it exists (production mode). Avatars/CVs are served
// from Supabase Storage directly, not from this server.
const dist = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, "index.html")));
}

// Central error handler (multer errors etc.)
app.use((err, req, res, next) => {
  res.status(400).json({ error: err.message || "Something went wrong" });
});

// Vercel imports this file as a serverless function and calls the exported
// app directly - it never runs the block below. Locally / on Render/Railway,
// `node server/index.js` starts a normal long-running server.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`The Quad server running on http://localhost:${PORT}`);
    console.log(fs.existsSync(dist) ? "Serving built client from client/dist" : "No client build found - API only (run: cd client && npm run build)");
  });
}

module.exports = app;
