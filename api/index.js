// Vercel catch-all serverless function for everything under /api/*.
// Delegates to the Express app defined in server/index.js.
const app = require("../server/index.js");

module.exports = (req, res) => app(req, res);
