// Auth: invite redemption, login, JWT middleware.
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db, inviteCode } = require("./db");

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET env var is required (any 64+ char random string)");
const SECRET = process.env.JWT_SECRET;

const PUBLIC_USER = `id,name,email,role,brand,programme,grad_year,job_title,company,industry,
  country,city,linkedin_url,bio,avatar_file,cv_visibility,created_at`;

function sign(user) {
  return jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: "30d" });
}

function resetToken() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const pick = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `RESET-${pick(4)}-${pick(4)}`;
}

async function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not signed in" });
  try {
    const payload = jwt.verify(token, SECRET);
    const user = await db.get(`SELECT ${PUBLIC_USER} FROM users WHERE id=? AND active=TRUE`, payload.id);
    if (!user) return res.status(401).json({ error: "Account not found or deactivated" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Session expired, sign in again" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admins only" });
  next();
}

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const user = await db.get("SELECT * FROM users WHERE LOWER(email)=LOWER(?)", email.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: "Wrong email or password" });
  if (!user.active) return res.status(403).json({ error: "This account has been deactivated" });
  delete user.password_hash;
  res.json({ token: sign(user), user });
});

// Forgot password. No mail provider is configured, so a request is recorded and the
// alumni office hands the member their reset link from the Admin Panel. The response is
// deliberately identical whether or not the email exists, so it can't be used to probe
// for registered addresses.
router.post("/forgot", async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email required" });
  const user = await db.get("SELECT id FROM users WHERE LOWER(email)=LOWER(?) AND active=TRUE", email.trim());
  if (user) {
    await db.run("UPDATE password_resets SET used_at=NOW() WHERE user_id=? AND used_at IS NULL", user.id);
    await db.run(
      "INSERT INTO password_resets (user_id,token,expires_at) VALUES (?,?,NOW() + INTERVAL '24 hours')",
      user.id, resetToken()
    );
  }
  res.json({ ok: true });
});

router.post("/reset", async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: "Reset code and new password required" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  const row = await db.get(
    `SELECT pr.id, pr.user_id FROM password_resets pr
     JOIN users u ON u.id=pr.user_id AND u.active=TRUE
     WHERE pr.token=? AND pr.used_at IS NULL AND pr.expires_at > NOW()`,
    token.trim().toUpperCase()
  );
  if (!row) return res.status(400).json({ error: "That reset code is invalid or has expired — request a new one" });
  await db.run("UPDATE users SET password_hash=? WHERE id=?", bcrypt.hashSync(password, 10), row.user_id);
  await db.run("UPDATE password_resets SET used_at=NOW() WHERE id=?", row.id);
  const user = await db.get(`SELECT ${PUBLIC_USER} FROM users WHERE id=?`, row.user_id);
  res.json({ token: sign(user), user });
});

router.post("/redeem", async (req, res) => {
  const { code, email, password, name } = req.body || {};
  if (!code || !email || !password) return res.status(400).json({ error: "Invite code, email and password required" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  const invite = await db.get("SELECT * FROM invites WHERE code=?", code.trim().toUpperCase());
  if (!invite) return res.status(404).json({ error: "Invite code not recognised" });
  if (invite.status === "redeemed") return res.status(409).json({ error: "This invite code has already been used" });
  if (invite.status === "revoked") return res.status(403).json({ error: "This invite code has been revoked" });
  const existing = await db.get("SELECT id FROM users WHERE LOWER(email)=LOWER(?)", email.trim());
  if (existing) return res.status(409).json({ error: "An account with this email already exists — sign in instead" });

  const info = await db.run(`INSERT INTO users (name,email,password_hash,brand,programme,grad_year,country)
    VALUES (?,?,?,?,?,?,?) RETURNING id`,
    (name || invite.name).trim(), email.trim(), bcrypt.hashSync(password, 10),
    invite.brand, invite.programme, invite.grad_year, invite.country
  );
  const newId = info.rows[0].id;
  await db.run("UPDATE invites SET status='redeemed', redeemed_by=? WHERE id=?", newId, invite.id);
  const user = await db.get(`SELECT ${PUBLIC_USER} FROM users WHERE id=?`, newId);
  res.json({ token: sign(user), user });
});

module.exports = { router, requireAuth, requireAdmin, PUBLIC_USER };
