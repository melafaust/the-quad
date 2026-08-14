// The Quad - all authenticated API routes.
const express = require("express");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const { db, inviteCode } = require("./db");
const { requireAuth, requireAdmin, PUBLIC_USER } = require("./auth");

const router = express.Router();
router.use(requireAuth);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required (avatar/CV storage)");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const AVATAR_BUCKET = process.env.SUPABASE_AVATAR_BUCKET || "avatars";
const CV_BUCKET = process.env.SUPABASE_CV_BUCKET || "cvs";

// Extension comes from the verified mimetype, never from the client's filename -
// stops a disguised .svg (or anything scriptable) landing in the avatars folder.
const SAFE_EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf" };
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = file.fieldname === "cv"
      ? file.mimetype === "application/pdf"
      : ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error(file.fieldname === "cv" ? "CV must be a PDF" : "Photo must be JPG, PNG or WebP"), ok);
  },
});

function avatarPathFromUrl(url) {
  const marker = `/object/public/${AVATAR_BUCKET}/`;
  const i = String(url || "").indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

const author = (alias = "u") => `${alias}.id AS author_id, ${alias}.name AS author_name, ${alias}.brand AS author_brand,
  ${alias}.programme AS author_programme, ${alias}.job_title AS author_job_title, ${alias}.company AS author_company,
  ${alias}.city AS author_city, ${alias}.country AS author_country, ${alias}.avatar_file AS author_avatar`;

async function connectionBetween(a, b) {
  return db.get(`SELECT * FROM connections
    WHERE (requester_id=? AND recipient_id=?) OR (requester_id=? AND recipient_id=?)`, a, b, b, a);
}
async function isConnected(a, b) {
  const c = await connectionBetween(a, b);
  return !!c && c.status === "accepted";
}

// Member-supplied links must be real web URLs - anything else (javascript:, data:)
// is rejected so links can never execute script in another member's browser.
function safeUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s.slice(0, 500) : null;
}
const BAD_URL = "Links must start with http:// or https://";

// A LinkedIn link is only useful if it points at an actual profile. Members were pasting
// bare handles, company pages and half-remembered URLs, which showed a working "in" icon
// that led to a 404. Accept the common shapes, normalise them, reject the rest.
function linkedInUrl(u) {
  let s = String(u || "").trim().replace(/\s+/g, "");
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = s.replace(/^(www\.)?(linkedin\.com)?\/?/i, "");
  const handle = s.replace(/^https?:\/\/([a-z]{2,3}\.)?(www\.)?linkedin\.com\/in\//i, "").replace(/^\/?in\//i, "");
  const slug = handle.split(/[/?#]/)[0];
  if (!/^[\w\-À-ÿ%]{3,100}$/.test(slug)) return null;
  return `https://www.linkedin.com/in/${slug}`;
}
const BAD_LINKEDIN = "Enter your LinkedIn profile URL (e.g. linkedin.com/in/your-name)";

/* ---------------- me / profiles ---------------- */

router.get("/me", (req, res) => res.json(req.user));

router.put("/me", async (req, res) => {
  const allowed = ["name", "job_title", "company", "industry", "country", "city", "linkedin_url", "bio", "cv_visibility"];
  const sets = [], vals = [];
  for (const k of allowed) if (k in req.body) {
    let v = String(req.body[k]).slice(0, 500);
    if (k === "linkedin_url") {
      v = linkedInUrl(v);
      if (v === null) return res.status(400).json({ error: BAD_LINKEDIN });
    }
    sets.push(`${k}=?`); vals.push(v);
  }
  if (!sets.length) return res.status(400).json({ error: "Nothing to update" });
  await db.run(`UPDATE users SET ${sets.join(",")} WHERE id=?`, vals, req.user.id);
  res.json(await db.get(`SELECT ${PUBLIC_USER} FROM users WHERE id=?`, req.user.id));
});

router.post("/me/avatar", upload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file received" });
  const ext = SAFE_EXT[req.file.mimetype] || ".bin";
  const objectPath = `u${req.user.id}-${Date.now()}${ext}`;
  const { error: upErr } = await supabase.storage.from(AVATAR_BUCKET)
    .upload(objectPath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
  if (upErr) return res.status(500).json({ error: "Upload failed" });
  const publicUrl = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath).data.publicUrl;
  const old = (await db.get("SELECT avatar_file FROM users WHERE id=?", req.user.id)).avatar_file;
  await db.run("UPDATE users SET avatar_file=? WHERE id=?", publicUrl, req.user.id);
  const oldPath = avatarPathFromUrl(old);
  if (oldPath) await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]);
  res.json({ avatar_file: publicUrl });
});

router.post("/me/cv", upload.single("cv"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file received" });
  const objectPath = `u${req.user.id}-${Date.now()}.pdf`;
  const { error: upErr } = await supabase.storage.from(CV_BUCKET)
    .upload(objectPath, req.file.buffer, { contentType: "application/pdf", upsert: false });
  if (upErr) return res.status(500).json({ error: "Upload failed" });
  const old = (await db.get("SELECT cv_file FROM users WHERE id=?", req.user.id)).cv_file;
  await db.run("UPDATE users SET cv_file=? WHERE id=?", objectPath, req.user.id);
  if (old) await supabase.storage.from(CV_BUCKET).remove([old]);
  res.json({ cv_file: objectPath });
});

router.delete("/me/cv", async (req, res) => {
  const old = (await db.get("SELECT cv_file FROM users WHERE id=?", req.user.id)).cv_file;
  await db.run("UPDATE users SET cv_file='' WHERE id=?", req.user.id);
  if (old) await supabase.storage.from(CV_BUCKET).remove([old]);
  res.json({ ok: true });
});

router.get("/users/:id", async (req, res) => {
  const u = await db.get(`SELECT ${PUBLIC_USER} FROM users WHERE id=? AND active=TRUE`, req.params.id);
  if (!u) return res.status(404).json({ error: "Member not found" });
  const me = req.user.id;
  const conn = await connectionBetween(me, Number(req.params.id));
  const canSeeCv = u.id === me || req.user.role === "admin" ||
    u.cv_visibility === "everyone" || (u.cv_visibility === "connections" && await isConnected(me, u.id));
  const mentor = await db.get("SELECT * FROM mentor_profiles WHERE user_id=? AND active=TRUE", u.id);
  res.json({
    ...u,
    cv_file: canSeeCv ? u.cv_file : "",
    has_cv: !!u.cv_file,
    connection: conn ? { id: conn.id, status: conn.status, requested_by_me: conn.requester_id === me } : null,
    mentoring: mentor || null,
  });
});

router.get("/users/:id/cv", async (req, res) => {
  const u = await db.get("SELECT id, name, cv_file, cv_visibility FROM users WHERE id=?", req.params.id);
  if (!u || !u.cv_file) return res.status(404).json({ error: "No CV" });
  const me = req.user.id;
  const ok = u.id === me || req.user.role === "admin" ||
    u.cv_visibility === "everyone" || (u.cv_visibility === "connections" && await isConnected(me, u.id));
  if (!ok) return res.status(403).json({ error: "This CV is only shared with connections" });
  const { data, error } = await supabase.storage.from(CV_BUCKET).createSignedUrl(u.cv_file, 60);
  if (error) return res.status(500).json({ error: "Could not generate download link" });
  res.redirect(data.signedUrl);
});

/* ---------------- directory + connections ---------------- */

router.get("/members", async (req, res) => {
  const { brand, programme, industry, country, mentoring, q } = req.query;
  const where = ["u.active=TRUE"], vals = [];
  if (brand) { where.push("u.brand=?"); vals.push(brand); }
  if (programme) { where.push("u.programme ILIKE ?"); vals.push(`%${programme}%`); }
  if (industry) { where.push("u.industry=?"); vals.push(industry); }
  // Country is matched case-insensitively: members typed their own, so the same place
  // exists as "Malaysia" and "MALAYSIA" and an exact match silently drops half of them.
  if (country) { where.push("LOWER(TRIM(u.country))=LOWER(TRIM(?))"); vals.push(country); }
  if (mentoring === "mentor") where.push("mp.active=TRUE AND mp.role IN ('mentor','both')");
  if (mentoring === "mentee") where.push("mp.active=TRUE AND mp.role IN ('mentee','both')");
  if (q) { where.push("(u.name ILIKE ? OR u.company ILIKE ? OR u.job_title ILIKE ?)"); vals.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const rows = await db.all(`
    SELECT u.id,u.name,u.brand,u.programme,u.grad_year,u.job_title,u.company,u.industry,u.country,u.city,
           u.linkedin_url,u.avatar_file, mp.role AS mentoring_role,
           c.status AS conn_status, c.requester_id AS conn_requester
    FROM users u
    LEFT JOIN mentor_profiles mp ON mp.user_id=u.id AND mp.active=TRUE
    LEFT JOIN connections c ON (c.requester_id=u.id AND c.recipient_id=@me) OR (c.recipient_id=u.id AND c.requester_id=@me)
    WHERE ${where.join(" AND ")}
    ORDER BY u.name`, vals, { me: req.user.id });
  const counts = await db.all("SELECT brand, COUNT(*) n FROM users WHERE active=TRUE GROUP BY brand");
  res.json({ members: rows, counts: Object.fromEntries(counts.map((c) => [c.brand, c.n])) });
});

router.get("/filters", async (req, res) => {
  res.json({
    industries: (await db.all("SELECT DISTINCT industry v FROM users WHERE industry!='' ORDER BY 1")).map((r) => r.v),
    // One entry per country regardless of how each member capitalised it.
    countries: (await db.all(`SELECT MIN(country) v FROM users WHERE TRIM(country)!=''
      GROUP BY LOWER(TRIM(country)) ORDER BY 1`)).map((r) => r.v),
    programmes: (await db.all("SELECT DISTINCT programme v FROM users WHERE programme NOT IN ('Alumni Office') ORDER BY 1")).map((r) => r.v),
  });
});

router.post("/connections/:userId", async (req, res) => {
  const other = Number(req.params.userId);
  if (other === req.user.id) return res.status(400).json({ error: "That's you" });
  if (!(await db.get("SELECT id FROM users WHERE id=? AND active=TRUE", other))) return res.status(404).json({ error: "Member not found" });
  if (await connectionBetween(req.user.id, other)) return res.status(409).json({ error: "Connection already exists" });
  await db.run("INSERT INTO connections (requester_id,recipient_id) VALUES (?,?)", req.user.id, other);
  res.json({ ok: true });
});

router.put("/connections/:id", async (req, res) => {
  const c = await db.get("SELECT * FROM connections WHERE id=?", req.params.id);
  if (!c || c.recipient_id !== req.user.id) return res.status(404).json({ error: "Request not found" });
  const status = req.body.accept ? "accepted" : "declined";
  await db.run("UPDATE connections SET status=? WHERE id=?", status, c.id);
  res.json({ ok: true, status });
});

router.get("/connections", async (req, res) => {
  const me = req.user.id;
  const accepted = await db.all(`
    SELECT c.id AS connection_id, ${author("u")}
    FROM connections c JOIN users u ON u.id = CASE WHEN c.requester_id=? THEN c.recipient_id ELSE c.requester_id END
    WHERE (c.requester_id=? OR c.recipient_id=?) AND c.status='accepted' AND u.active=TRUE ORDER BY u.name`, me, me, me);
  const pending = await db.all(`
    SELECT c.id AS connection_id, ${author("u")}
    FROM connections c JOIN users u ON u.id=c.requester_id
    WHERE c.recipient_id=? AND c.status='pending' AND u.active=TRUE ORDER BY c.created_at DESC`, me);
  res.json({ accepted, pending });
});

/* ---------------- feed ---------------- */

const POST_SELECT = `
  SELECT p.id, p.body, p.link_url, p.created_at, ${author("u")},
    (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id=p.id) AS likes,
    (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id=p.id) AS comments,
    EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id=p.id AND pl.user_id=@me) AS liked_by_me
  FROM posts p JOIN users u ON u.id=p.author_id AND u.active=TRUE`;

router.get("/feed", async (req, res) => {
  const posts = await db.all(`${POST_SELECT} ORDER BY p.created_at DESC LIMIT 50`, { me: req.user.id });
  res.json(posts);
});

router.post("/posts", async (req, res) => {
  const body = (req.body.body || "").trim();
  if (!body) return res.status(400).json({ error: "Write something first" });
  const link = safeUrl(req.body.link_url);
  if (link === null) return res.status(400).json({ error: BAD_URL });
  const info = await db.run("INSERT INTO posts (author_id,body,link_url) VALUES (?,?,?) RETURNING id",
    req.user.id, body.slice(0, 3000), link);
  res.json(await db.get(`${POST_SELECT} WHERE p.id=@id`, { me: req.user.id, id: info.rows[0].id }));
});

router.delete("/posts/:id", async (req, res) => {
  const p = await db.get("SELECT author_id FROM posts WHERE id=?", req.params.id);
  if (!p) return res.status(404).json({ error: "Post not found" });
  if (p.author_id !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Not your post" });
  await db.run("DELETE FROM posts WHERE id=?", req.params.id);
  res.json({ ok: true });
});

router.post("/posts/:id/like", async (req, res) => {
  const liked = await db.get("SELECT 1 FROM post_likes WHERE post_id=? AND user_id=?", req.params.id, req.user.id);
  if (liked) await db.run("DELETE FROM post_likes WHERE post_id=? AND user_id=?", req.params.id, req.user.id);
  else await db.run("INSERT INTO post_likes VALUES (?,?)", req.params.id, req.user.id);
  const likes = (await db.get("SELECT COUNT(*) n FROM post_likes WHERE post_id=?", req.params.id)).n;
  res.json({ likes, liked_by_me: !liked });
});

router.get("/posts/:id/comments", async (req, res) => {
  res.json(await db.all(`SELECT pc.id, pc.body, pc.created_at, ${author("u")}
    FROM post_comments pc JOIN users u ON u.id=pc.author_id WHERE pc.post_id=? ORDER BY pc.created_at`, req.params.id));
});

router.post("/posts/:id/comments", async (req, res) => {
  const body = (req.body.body || "").trim();
  if (!body) return res.status(400).json({ error: "Write something first" });
  await db.run("INSERT INTO post_comments (post_id,author_id,body) VALUES (?,?,?)", req.params.id, req.user.id, body.slice(0, 1000));
  res.json({ ok: true });
});

/* ---------------- jobs ---------------- */

router.get("/jobs", async (req, res) => {
  const { country, fn, q } = req.query;
  const where = ["1=1"], vals = [];
  if (country) { where.push("j.country=?"); vals.push(country); }
  if (fn) { where.push("j.job_function=?"); vals.push(fn); }
  if (q) { where.push("(j.title ILIKE ? OR j.company ILIKE ?)"); vals.push(`%${q}%`, `%${q}%`); }
  res.json(await db.all(`SELECT j.*, ${author("u")} FROM jobs j JOIN users u ON u.id=j.poster_id
    WHERE ${where.join(" AND ")} ORDER BY j.created_at DESC LIMIT 100`, vals));
});

router.post("/jobs", async (req, res) => {
  const b = req.body;
  if (!b.title || !b.company) return res.status(400).json({ error: "Title and company are required" });
  b.apply_url = safeUrl(b.apply_url);
  if (b.apply_url === null) return res.status(400).json({ error: BAD_URL });
  const vals = ["title","company","location","country","job_type","salary_range","job_function","description","apply_url","apply_email"].map((k) => String(b[k] || "").slice(0, 1000));
  const info = await db.run(`INSERT INTO jobs (poster_id,title,company,location,country,job_type,salary_range,job_function,description,apply_url,apply_email)
    VALUES (?,?,?,?,?,?,?,?,?,?,?) RETURNING id`, req.user.id, vals);
  res.json({ id: info.rows[0].id });
});

router.delete("/jobs/:id", async (req, res) => {
  const j = await db.get("SELECT poster_id FROM jobs WHERE id=?", req.params.id);
  if (!j) return res.status(404).json({ error: "Job not found" });
  if (j.poster_id !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Not your job post" });
  await db.run("DELETE FROM jobs WHERE id=?", req.params.id);
  res.json({ ok: true });
});

/* ---------------- marketplace ---------------- */

router.get("/listings", async (req, res) => {
  const { kind, category, country } = req.query;
  const where = ["l.status='live'"], vals = [];
  if (kind) { where.push("l.kind=?"); vals.push(kind); }
  if (category) { where.push("l.category=?"); vals.push(category); }
  if (country) { where.push("l.country=?"); vals.push(country); }
  res.json(await db.all(`SELECT l.*, ${author("u")} FROM listings l JOIN users u ON u.id=l.owner_id
    WHERE ${where.join(" AND ")} ORDER BY l.created_at DESC LIMIT 100`, vals));
});

router.post("/listings", async (req, res) => {
  const b = req.body;
  if (!b.title || !["offer", "request"].includes(b.kind) || !["service", "product"].includes(b.category))
    return res.status(400).json({ error: "Title, kind (offer/request) and category (service/product) are required" });
  const vals = ["title","description","tags","price_note","country","city"].map((k) => String(b[k] || "").slice(0, 1000));
  const info = await db.run(`INSERT INTO listings (owner_id,kind,category,title,description,tags,price_note,country,city)
    VALUES (?,?,?,?,?,?,?,?,?) RETURNING id`, req.user.id, b.kind, b.category, vals);
  res.json({ id: info.rows[0].id });
});

router.put("/listings/:id/close", async (req, res) => {
  const l = await db.get("SELECT owner_id FROM listings WHERE id=?", req.params.id);
  if (!l) return res.status(404).json({ error: "Listing not found" });
  if (l.owner_id !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Not your listing" });
  await db.run("UPDATE listings SET status='closed' WHERE id=?", req.params.id);
  res.json({ ok: true });
});

router.delete("/listings/:id", async (req, res) => {
  const l = await db.get("SELECT owner_id FROM listings WHERE id=?", req.params.id);
  if (!l) return res.status(404).json({ error: "Listing not found" });
  if (l.owner_id !== req.user.id && req.user.role !== "admin") return res.status(403).json({ error: "Not your listing" });
  await db.run("DELETE FROM listings WHERE id=?", req.params.id);
  res.json({ ok: true });
});

/* ---------------- mentoring ---------------- */

router.get("/mentors", async (req, res) => {
  const { industry } = req.query;
  const where = ["mp.active=TRUE", "mp.role IN ('mentor','both')", "u.active=TRUE"], vals = [];
  if (industry) { where.push("mp.industries ILIKE ?"); vals.push(`%${industry}%`); }
  const rows = await db.all(`
    SELECT mp.*, ${author("u")},
      (SELECT COUNT(*) FROM mentorships m WHERE m.mentor_id=u.id AND m.status='active') AS active_mentees,
      EXISTS(SELECT 1 FROM mentorships m WHERE m.mentor_id=u.id AND m.mentee_id=@me AND m.status IN ('requested','active')) AS requested_by_me
    FROM mentor_profiles mp JOIN users u ON u.id=mp.user_id
    WHERE ${where.join(" AND ")} ORDER BY u.name`, vals, { me: req.user.id });
  res.json(rows);
});

router.put("/me/mentoring", async (req, res) => {
  const { role, industries, expertise, capacity, note, active } = req.body;
  if (active === false) {
    await db.run("UPDATE mentor_profiles SET active=FALSE WHERE user_id=?", req.user.id);
    return res.json({ ok: true });
  }
  if (!["mentor", "mentee", "both"].includes(role)) return res.status(400).json({ error: "Pick mentor, mentee or both" });
  await db.run(`INSERT INTO mentor_profiles (user_id,role,industries,expertise,capacity,note,active)
    VALUES (?,?,?,?,?,?,TRUE)
    ON CONFLICT (user_id) DO UPDATE SET role=EXCLUDED.role, industries=EXCLUDED.industries,
      expertise=EXCLUDED.expertise, capacity=EXCLUDED.capacity, note=EXCLUDED.note, active=TRUE`,
    req.user.id, role, String(industries || "").slice(0, 300), String(expertise || "").slice(0, 300),
    Math.max(0, Math.min(10, Number(capacity) || 0)), String(note || "").slice(0, 500));
  res.json(await db.get("SELECT * FROM mentor_profiles WHERE user_id=?", req.user.id));
});

router.post("/mentorships", async (req, res) => {
  const mentorId = Number(req.body.mentor_id);
  const mp = await db.get("SELECT * FROM mentor_profiles WHERE user_id=? AND active=TRUE AND role IN ('mentor','both')", mentorId);
  if (!mp) return res.status(404).json({ error: "This member isn't mentoring right now" });
  if (mentorId === req.user.id) return res.status(400).json({ error: "You can't mentor yourself" });
  const existing = await db.get("SELECT 1 FROM mentorships WHERE mentor_id=? AND mentee_id=? AND status IN ('requested','active')", mentorId, req.user.id);
  if (existing) return res.status(409).json({ error: "You already have a request or mentorship with this mentor" });
  const active = (await db.get("SELECT COUNT(*) n FROM mentorships WHERE mentor_id=? AND status='active'", mentorId)).n;
  if (active >= mp.capacity) return res.status(409).json({ error: "This mentor is at capacity right now" });
  await db.run("INSERT INTO mentorships (mentor_id,mentee_id,goal_note) VALUES (?,?,?)",
    mentorId, req.user.id, String(req.body.goal_note || "").slice(0, 500));
  res.json({ ok: true });
});

router.put("/mentorships/:id", async (req, res) => {
  const m = await db.get("SELECT * FROM mentorships WHERE id=?", req.params.id);
  if (!m) return res.status(404).json({ error: "Not found" });
  const { status } = req.body;
  const asMentor = m.mentor_id === req.user.id, asMentee = m.mentee_id === req.user.id;
  const allowed = (asMentor && ["active", "declined", "ended"].includes(status)) || (asMentee && status === "ended");
  if (!allowed) return res.status(403).json({ error: "You can't make that change" });
  await db.run("UPDATE mentorships SET status=? WHERE id=?", status, m.id);
  res.json({ ok: true });
});

router.get("/mentorships", async (req, res) => {
  const me = req.user.id;
  const asMentor = await db.all(`SELECT m.*, ${author("u")} FROM mentorships m JOIN users u ON u.id=m.mentee_id
    WHERE m.mentor_id=? AND m.status IN ('requested','active') ORDER BY m.created_at DESC`, me);
  const asMentee = await db.all(`SELECT m.*, ${author("u")} FROM mentorships m JOIN users u ON u.id=m.mentor_id
    WHERE m.mentee_id=? AND m.status IN ('requested','active') ORDER BY m.created_at DESC`, me);
  res.json({ asMentor, asMentee });
});

/* ---------------- events ---------------- */

router.get("/events", async (req, res) => {
  res.json(await db.all(`
    SELECT e.*, (SELECT COUNT(*) FROM rsvps r WHERE r.event_id=e.id) AS going,
      EXISTS(SELECT 1 FROM rsvps r WHERE r.event_id=e.id AND r.user_id=@me) AS my_rsvp
    FROM events e WHERE e.event_date >= NOW() - INTERVAL '12 hours' ORDER BY e.event_date`, { me: req.user.id }));
});

router.post("/events", requireAdmin, async (req, res) => {
  const { title, event_date, location, description } = req.body;
  if (!title || !event_date) return res.status(400).json({ error: "Title and date are required" });
  const info = await db.run("INSERT INTO events (title,event_date,location,description,created_by) VALUES (?,?,?,?,?) RETURNING id",
    String(title).slice(0, 200), event_date, String(location || "").slice(0, 200), String(description || "").slice(0, 1000), req.user.id);
  res.json({ id: info.rows[0].id });
});

router.delete("/events/:id", requireAdmin, async (req, res) => {
  await db.run("DELETE FROM events WHERE id=?", req.params.id);
  res.json({ ok: true });
});

router.post("/events/:id/rsvp", async (req, res) => {
  const has = await db.get("SELECT 1 FROM rsvps WHERE event_id=? AND user_id=?", req.params.id, req.user.id);
  if (has) await db.run("DELETE FROM rsvps WHERE event_id=? AND user_id=?", req.params.id, req.user.id);
  else await db.run("INSERT INTO rsvps VALUES (?,?)", req.params.id, req.user.id);
  const going = (await db.get("SELECT COUNT(*) n FROM rsvps WHERE event_id=?", req.params.id)).n;
  res.json({ going, my_rsvp: !has });
});

/* ---------------- messages ---------------- */

router.get("/messages", async (req, res) => {
  const me = req.user.id;
  const rows = await db.all(`
    SELECT u.id AS partner_id, u.name, u.avatar_file, u.job_title, u.company,
      (SELECT body FROM messages m2 WHERE (m2.sender_id=u.id AND m2.recipient_id=@me) OR (m2.sender_id=@me AND m2.recipient_id=u.id)
        ORDER BY m2.created_at DESC LIMIT 1) AS last_body,
      (SELECT created_at FROM messages m2 WHERE (m2.sender_id=u.id AND m2.recipient_id=@me) OR (m2.sender_id=@me AND m2.recipient_id=u.id)
        ORDER BY m2.created_at DESC LIMIT 1) AS last_at,
      (SELECT COUNT(*) FROM messages m3 WHERE m3.sender_id=u.id AND m3.recipient_id=@me AND m3.read_at IS NULL) AS unread
    FROM users u
    WHERE u.active=TRUE AND u.id != @me AND EXISTS
      (SELECT 1 FROM messages m WHERE (m.sender_id=u.id AND m.recipient_id=@me) OR (m.sender_id=@me AND m.recipient_id=u.id))
    ORDER BY last_at DESC`, { me });
  res.json(rows);
});

router.get("/messages/unread-count", async (req, res) => {
  res.json({ unread: (await db.get("SELECT COUNT(*) n FROM messages WHERE recipient_id=? AND read_at IS NULL", req.user.id)).n });
});

router.get("/messages/:userId", async (req, res) => {
  const other = Number(req.params.userId);
  const partner = await db.get(`SELECT ${PUBLIC_USER} FROM users WHERE id=? AND active=TRUE`, other);
  if (!partner) return res.status(404).json({ error: "Member not found" });
  await db.run("UPDATE messages SET read_at=NOW() WHERE sender_id=? AND recipient_id=? AND read_at IS NULL", other, req.user.id);
  const thread = await db.all(`SELECT * FROM messages
    WHERE (sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)
    ORDER BY created_at LIMIT 500`, req.user.id, other, other, req.user.id);
  res.json({ partner, thread });
});

router.post("/messages/:userId", async (req, res) => {
  const other = Number(req.params.userId);
  const body = (req.body.body || "").trim();
  if (!body) return res.status(400).json({ error: "Write something first" });
  if (!(await db.get("SELECT id FROM users WHERE id=? AND active=TRUE", other))) return res.status(404).json({ error: "Member not found" });
  await db.run("INSERT INTO messages (sender_id,recipient_id,body) VALUES (?,?,?)", req.user.id, other, body.slice(0, 2000));
  res.json({ ok: true });
});

/* ---------------- home dashboard ---------------- */

router.get("/home", async (req, res) => {
  const me = req.user;
  const newJobs = (await db.get(`SELECT COUNT(*) n FROM jobs WHERE created_at >= NOW() - INTERVAL '7 days'
    AND (job_function=? OR ?='')`, me.industry || "", me.industry || "")).n;
  const pendingMentees = (await db.get("SELECT COUNT(*) n FROM mentorships WHERE mentor_id=? AND status='requested'", me.id)).n;
  const pendingConnections = (await db.get("SELECT COUNT(*) n FROM connections WHERE recipient_id=? AND status='pending'", me.id)).n;
  const nextEvent = await db.get("SELECT * FROM events WHERE event_date >= NOW() ORDER BY event_date LIMIT 1");
  const newMembers = await db.all(`SELECT id,name,job_title,company,city,country,brand,avatar_file
    FROM users WHERE active=TRUE AND role='member' AND id!=? ORDER BY created_at DESC LIMIT 4`, me.id);
  const latestRequest = await db.get(`SELECT l.*, ${author("u")} FROM listings l JOIN users u ON u.id=l.owner_id
    WHERE l.status='live' AND l.kind='request' ORDER BY l.created_at DESC LIMIT 1`);
  const matchedJob = await db.get(`SELECT j.*, ${author("u")} FROM jobs j JOIN users u ON u.id=j.poster_id
    WHERE (j.job_function=? OR ?='') ORDER BY j.created_at DESC LIMIT 1`, me.industry || "", me.industry || "");
  const deal = await db.get(`SELECT l.*, ${author("u")} FROM listings l JOIN users u ON u.id=l.owner_id
    WHERE l.status='live' AND l.kind='offer' ORDER BY l.created_at DESC LIMIT 1`);
  const stats = {
    connections: (await db.get("SELECT COUNT(*) n FROM connections WHERE (requester_id=? OR recipient_id=?) AND status='accepted'", me.id, me.id)).n,
  };
  res.json({ newJobs, pendingMentees, pendingConnections, nextEvent, newMembers, latestRequest, matchedJob, deal, stats });
});

/* ---------------- admin ---------------- */

router.use("/admin", requireAdmin);

router.get("/admin/stats", async (req, res) => {
  const one = async (sql) => (await db.get(sql)).n;
  res.json({
    members: await one("SELECT COUNT(*) n FROM users WHERE active=TRUE"),
    invites_pending: await one("SELECT COUNT(*) n FROM invites WHERE status='sent'"),
    jobs_live: await one("SELECT COUNT(*) n FROM jobs"),
    listings_live: await one("SELECT COUNT(*) n FROM listings WHERE status='live'"),
    posts: await one("SELECT COUNT(*) n FROM posts"),
    rsvps_next: (await db.get(`SELECT COUNT(*) n FROM rsvps WHERE event_id=
      (SELECT id FROM events WHERE event_date>=NOW() ORDER BY event_date LIMIT 1)`)).n,
  });
});

router.get("/admin/invites", async (req, res) => {
  res.json(await db.all(`SELECT i.*, u.name AS redeemed_name FROM invites i
    LEFT JOIN users u ON u.id=i.redeemed_by ORDER BY i.created_at DESC`));
});

router.post("/admin/invites", async (req, res) => {
  const { name, email, brand, programme, grad_year, country } = req.body;
  if (!name || !email || !brand || !programme) return res.status(400).json({ error: "Name, email, brand and programme are required" });
  const code = inviteCode();
  await db.run("INSERT INTO invites (code,name,email,brand,programme,grad_year,country) VALUES (?,?,?,?,?,?,?)",
    code, name, email, brand, programme, grad_year || null, country || "");
  res.json({ code });
});

// CSV import: client posts {csv:"name,email,brand,programme,grad_year,country\n..."}
router.post("/admin/invites/import", async (req, res) => {
  const text = String(req.body.csv || "").trim();
  if (!text) return res.status(400).json({ error: "Empty CSV" });
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const need = ["name", "email", "brand", "programme"];
  if (!need.every((h) => header.includes(h)))
    return res.status(400).json({ error: `CSV header must include: ${need.join(", ")} (optional: grad_year, country)` });
  const col = (row, key) => { const i = header.indexOf(key); return i >= 0 ? (row[i] || "").trim() : ""; };
  let created = 0, skipped = [];
  await db.transaction(async (tx) => {
    for (const line of lines.slice(1)) {
      const row = line.split(",").map((c) => c.trim());
      const email = col(row, "email");
      if (!email || !col(row, "name")) { skipped.push(line); continue; }
      if (await tx.get("SELECT 1 FROM invites WHERE LOWER(email)=LOWER(?) AND status!='revoked'", email) ||
          await tx.get("SELECT 1 FROM users WHERE LOWER(email)=LOWER(?)", email)) { skipped.push(email + " (already invited or a member)"); continue; }
      const brand = col(row, "brand").toUpperCase() === "ICQA" ? "ICQA" : "EDUK8U";
      await tx.run("INSERT INTO invites (code,name,email,brand,programme,grad_year,country) VALUES (?,?,?,?,?,?,?)",
        inviteCode(), col(row, "name"), email, brand, col(row, "programme"), Number(col(row, "grad_year")) || null, col(row, "country"));
      created++;
    }
  });
  res.json({ created, skipped });
});

router.get("/admin/invites/export", async (req, res) => {
  const rows = await db.all("SELECT code,name,email,brand,programme,grad_year,country,status FROM invites ORDER BY created_at DESC");
  const csv = ["code,name,email,brand,programme,grad_year,country,status",
    ...rows.map((r) => [r.code, r.name, r.email, r.brand, r.programme, r.grad_year || "", r.country, r.status]
      .map((v) => String(v).includes(",") ? `"${v}"` : v).join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=quad-invites.csv");
  res.send(csv);
});

router.delete("/admin/invites/:id", async (req, res) => {
  await db.run("UPDATE invites SET status='revoked' WHERE id=? AND status='sent'", req.params.id);
  res.json({ ok: true });
});

router.get("/admin/members", async (req, res) => {
  res.json(await db.all(`SELECT id,name,email,role,brand,programme,job_title,company,country,active,created_at
    FROM users ORDER BY created_at DESC`));
});

router.put("/admin/members/:id", async (req, res) => {
  const target = await db.get("SELECT id, role FROM users WHERE id=?", req.params.id);
  if (!target) return res.status(404).json({ error: "Member not found" });
  if (target.id === req.user.id) return res.status(400).json({ error: "You can't change your own account here" });
  if ("active" in req.body) await db.run("UPDATE users SET active=? WHERE id=?", req.body.active ? true : false, target.id);
  if ("role" in req.body && ["member", "admin"].includes(req.body.role))
    await db.run("UPDATE users SET role=? WHERE id=?", req.body.role, target.id);
  res.json({ ok: true });
});

// Outstanding password-reset requests, so the alumni office can pass the member their code.
router.get("/admin/password-resets", async (req, res) => {
  res.json(await db.all(`SELECT pr.token, pr.created_at, pr.expires_at, u.name, u.email
    FROM password_resets pr JOIN users u ON u.id=pr.user_id
    WHERE pr.used_at IS NULL AND pr.expires_at > NOW()
    ORDER BY pr.created_at DESC`));
});

// ── Test Dashboard ────────────────────────────────────────────────────────────
router.get("/admin/test-runs", requireAdmin, async (req, res) => {
  const runs = await db.all(
    "SELECT id, run_at, passed, failed, total, tests, trigger FROM test_runs ORDER BY run_at DESC LIMIT 20"
  );
  res.json(runs.map((r) => ({ ...r, tests: r.tests ? JSON.parse(r.tests) : [] })));
});

router.post("/admin/test-runs/trigger", requireAdmin, async (req, res) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: "GITHUB_TOKEN not configured" });
  const https = require("https");
  const body = JSON.stringify({ ref: "main" });
  const options = {
    hostname: "api.github.com",
    path: "/repos/dev-eduk8u/the-quad/actions/workflows/regression.yml/dispatches",
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "the-quad-dashboard",
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  };
  const ghReq = https.request(options, (ghRes) => {
    if (ghRes.statusCode === 204) return res.json({ ok: true, message: "Tests started — results appear in ~3 minutes" });
    let d = "";
    ghRes.on("data", (c) => (d += c));
    ghRes.on("end", () => res.status(ghRes.statusCode).json({ error: d }));
  });
  ghReq.on("error", (e) => res.status(500).json({ error: e.message }));
  ghReq.write(body);
  ghReq.end();
});

module.exports = router;
