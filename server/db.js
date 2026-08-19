// The Quad - database setup, schema and demo seed.
// Postgres (Supabase) via `pg`. Connection string from DATABASE_URL.
// Set SEED_DEMO=0 to start with only the admin accounts (production).
const { Pool, types } = require("pg");
const bcrypt = require("bcryptjs");

// COUNT(*) etc. come back as BIGINT (OID 20), which pg returns as a string by
// default to avoid precision loss. These counts are always small in this app -
// parse them to numbers so `count >= x` comparisons work like they did with SQLite.
types.setTypeParser(20, (v) => parseInt(v, 10));

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL env var is required (Supabase connection string)");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Mimics better-sqlite3's db.prepare(sql).get/.all/.run(...) so route handlers
// stay close to the original SQLite queries. Accepts a trailing named-params
// object (for `@name` placeholders) mixed with positional args (for `?`).
function build(sql, args) {
  let positional = [];
  let named = {};
  for (const a of args) {
    // A Date is an object but is a value, not a bag of named params — without this it
    // would be spread into `named` and silently dropped from the query.
    if (Array.isArray(a)) positional = positional.concat(a);
    else if (a instanceof Date || Buffer.isBuffer(a)) positional.push(a);
    else if (a && typeof a === "object") named = { ...named, ...a };
    else positional.push(a);
  }
  const values = [];
  const namedSeen = {};
  let pIdx = 0;
  const text = sql.replace(/\?|@(\w+)/g, (m, name) => {
    if (name) {
      if (!(name in namedSeen)) {
        values.push(named[name]);
        namedSeen[name] = values.length;
      }
      return `$${namedSeen[name]}`;
    }
    values.push(positional[pIdx++]);
    return `$${values.length}`;
  });
  return { text, values };
}

const db = {
  get: async (sql, ...args) => (await pool.query(build(sql, args))).rows[0],
  all: async (sql, ...args) => (await pool.query(build(sql, args))).rows,
  run: async (sql, ...args) => {
    const r = await pool.query(build(sql, args));
    return { changes: r.rowCount, rows: r.rows };
  },
  // Runs `fn` against a single client wrapped in BEGIN/COMMIT/ROLLBACK.
  // `fn` receives a client-scoped db-like object with the same get/all/run API.
  transaction: async (fn) => {
    const client = await pool.connect();
    const scoped = {
      get: async (sql, ...args) => (await client.query(build(sql, args))).rows[0],
      all: async (sql, ...args) => (await client.query(build(sql, args))).rows,
      run: async (sql, ...args) => {
        const r = await client.query(build(sql, args));
        return { changes: r.rowCount, rows: r.rows };
      },
    };
    try {
      await client.query("BEGIN");
      const result = await fn(scoped);
      await client.query("COMMIT");
      return result;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },
};

function inviteCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const pick = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `QUAD-${pick(4)}-${pick(2)}`;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  brand TEXT NOT NULL,
  programme TEXT NOT NULL,
  grad_year INTEGER,
  job_title TEXT DEFAULT '',
  company TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  country TEXT DEFAULT '',
  city TEXT DEFAULT '',
  linkedin_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  avatar_file TEXT DEFAULT '',
  cv_file TEXT DEFAULT '',
  cv_visibility TEXT NOT NULL DEFAULT 'connections',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS invites (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  brand TEXT NOT NULL,
  programme TEXT NOT NULL,
  grad_year INTEGER,
  country TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'sent',
  redeemed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per thing that happened to you. The bell used to compute pending requests live,
-- so nothing that had already been dealt with (a like, a comment) was ever recorded.
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  link TEXT DEFAULT '',
  body TEXT DEFAULT '',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, read_at, created_at DESC);

-- Every removal, deactivation and role change, so the alumni office can answer
-- "why was my post taken down?" without guesswork.
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER,
  detail TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Member-raised reports on posts, comments and messages.
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  reason TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Applications live inside The Quad. Previously "Apply" handed off to an email client or an
-- external link, so the app never learned an application had happened and the poster had
-- nothing to be notified about.
CREATE TABLE IF NOT EXISTS job_applications (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT DEFAULT '',
  share_cv BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, applicant_id)
);

CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connections (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requester_id, recipient_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  link_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  poster_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT DEFAULT '',
  country TEXT DEFAULT '',
  job_type TEXT DEFAULT 'Full-time',
  salary_range TEXT DEFAULT '',
  job_function TEXT DEFAULT '',
  description TEXT DEFAULT '',
  apply_url TEXT DEFAULT '',
  apply_email TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listings (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  price_note TEXT DEFAULT '',
  country TEXT DEFAULT '',
  city TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'live',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  event_date TIMESTAMP NOT NULL,
  location TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rsvps (
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS mentor_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'mentor',
  industries TEXT DEFAULT '',
  expertise TEXT DEFAULT '',
  capacity INTEGER NOT NULL DEFAULT 2,
  note TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS mentorships (
  id SERIAL PRIMARY KEY,
  mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_note TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'requested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_conn_recipient ON connections(recipient_id, status);

-- These tables already exist in production, so new columns have to be added rather than
-- declared above. Removal is now a flag instead of a DELETE, which is what makes a
-- restore possible at all.
ALTER TABLE posts          ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;
ALTER TABLE posts          ADD COLUMN IF NOT EXISTS removed_by INTEGER;
ALTER TABLE jobs           ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;
ALTER TABLE jobs           ADD COLUMN IF NOT EXISTS removed_by INTEGER;
ALTER TABLE post_comments  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;
ALTER TABLE post_comments  ADD COLUMN IF NOT EXISTS removed_by INTEGER;
ALTER TABLE users          ADD COLUMN IF NOT EXISTS tour_done_at TIMESTAMPTZ;
ALTER TABLE messages       ADD COLUMN IF NOT EXISTS recalled_at TIMESTAMPTZ;
ALTER TABLE messages       ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
`;

const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const hoursAgo = (n) => new Date(Date.now() - n * 3600000);

async function seed() {
  const { n: userCount } = await db.get("SELECT COUNT(*) n FROM users");
  if (Number(userCount) > 0) return;

  const adminHash = bcrypt.hashSync("ChangeMe123!", 10);
  const demoHash = bcrypt.hashSync("demo123", 10);

  const insUser = async (u) => db.run(`INSERT INTO users
    (name,email,password_hash,role,brand,programme,grad_year,job_title,company,industry,country,city,linkedin_url,bio,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [u.name, u.email, u.hash, u.role, u.brand, u.programme, u.grad_year, u.job_title, u.company, u.industry, u.country, u.city, u.linkedin, u.bio, daysAgo(u.ago)]);

  const admins = [
    { name: "Winnie Tam", email: "winnie.tam@eduk8u.com", role: "admin", brand: "EDUK8U", programme: "Alumni Office", grad_year: null, job_title: "Operations & Marketing Director", company: "EDUK8U", industry: "Education & Training", country: "Malaysia", city: "Kuala Lumpur", bio: "Alumni Office. Say hello!", ago: 60 },
    { name: "Dr Roy Prasad", email: "roy.prasad@eduk8u.com", role: "admin", brand: "EDUK8U", programme: "Alumni Office", grad_year: null, job_title: "Chief Executive Officer", company: "EDUK8U", industry: "Education & Training", country: "Malaysia", city: "Kuala Lumpur", bio: "CEO, EDUK8U & ICQA.", ago: 60 },
  ];
  for (const a of admins) await insUser({ linkedin: "", ...a, hash: adminHash });

  if (process.env.SEED_DEMO === "0") return;

  const members = [
    ["Nurul Aina Rahman","nurul.rahman@demo.thequad","EDUK8U","DBA",2025,"HR Business Partner","Petronas Dagangan","Human Resources","Malaysia","Kuala Lumpur","Doctoral research on talent retention in GLCs. Happy to talk shop on HR analytics.",44],
    ["Dinesh Jayawardena","dinesh.j@demo.thequad","EDUK8U","Masters (MBA)",2023,"Operations Manager","MAS Holdings","Operations","Sri Lanka","Colombo","Apparel operations, lean manufacturing, and building L&D teams.",41],
    ["Mereani Tuivanuavou","mereani.t@demo.thequad","ICQA","Diploma of HR",2024,"Training Coordinator","Fiji Airways","Aviation","Fiji","Nadi","Workforce planning and aviation training in the Pacific.",39],
    ["Ahmad Faiz Ismail","ahmad.faiz@demo.thequad","ICQA","Cert IV HR",2024,"Talent Acquisition Lead","AirAsia","Human Resources","Malaysia","Kuala Lumpur","Volume hiring, employer branding, always happy to refer good people.",37],
    ["Priyanka Fernando","priyanka.f@demo.thequad","EDUK8U","DBA",2025,"HR Director","Dialog Axiata","Telecommunications","Sri Lanka","Colombo","15 years across telecoms and FMCG. Mentoring alumni moving into senior HR roles.",35],
    ["Josaia Waqairatu","josaia.w@demo.thequad","EDUK8U","Micro-credential: People Analytics",2024,"People & Culture Manager","Vodafone Fiji","Telecommunications","Fiji","Suva","People analytics and Pacific workforce development.",33],
    ["Litia Vakacegu","litia.v@demo.thequad","ICQA","Cert IV HR",2025,"HR Officer","Queensland Care Group","Healthcare","Australia","Brisbane","NDIS sector HR. Recently moved to Brisbane.",30],
    ["Sanjeewa Perera","sanjeewa.p@demo.thequad","EDUK8U","Masters (MBA)",2024,"Finance Manager","Hemas Holdings","Finance","Sri Lanka","Colombo","Corporate finance and post-merger integration.",28],
    ["Hafiz Abdullah","hafiz.ab@demo.thequad","EDUK8U","Micro-credential: Digital Marketing",2025,"Marketing Lead","Sime Darby Plantation","Manufacturing","Malaysia","Kuala Lumpur","B2B marketing in plantations and commodities.",26],
    ["Salote Naulivou","salote.n@demo.thequad","ICQA","Diploma of Business",2023,"Operations Supervisor","Fiji Water","Manufacturing","Fiji","Suva","FMCG operations, quality systems.",25],
    ["Kavindi Wijesinghe","kavindi.w@demo.thequad","EDUK8U","DBA",2026,"Head of Learning","Commercial Bank of Ceylon","Finance","Sri Lanka","Colombo","Building a learning culture in banking. DBA candidate.",23],
    ["Tevita Rokobaro","tevita.r@demo.thequad","ICQA","Cert IV Training & Assessment",2024,"Compliance Trainer","Fiji National University","Education & Training","Fiji","Suva","VET compliance and trainer development.",22],
    ["Lim Wei Sheng","weisheng.lim@demo.thequad","EDUK8U","Masters (MBA)",2023,"Supply Chain Manager","Nestle Malaysia","Logistics","Malaysia","Petaling Jaya","End-to-end supply chain, S&OP.",20],
    ["Shalini Rajapakse","shalini.r@demo.thequad","ICQA","Diploma of HR",2025,"People Partner","John Keells Holdings","Hospitality","Sri Lanka","Colombo","Hospitality HR across resorts and leisure.",19],
    ["Nor Azlina Bakar","azlina.b@demo.thequad","EDUK8U","DBA",2024,"General Manager, HR","Tenaga Nasional","Human Resources","Malaysia","Kuala Lumpur","Energy sector HR transformation. Open to mentoring.",18],
    ["Peni Cakau","peni.c@demo.thequad","ICQA","Diploma of Business",2024,"Branch Manager","BSP Financial Group","Finance","Fiji","Lautoka","Retail banking and SME lending in the Pacific.",16],
    ["Tharindu Silva","tharindu.s@demo.thequad","EDUK8U","Micro-credential: Project Management",2025,"Project Manager","MillenniumIT ESP","Telecommunications","Sri Lanka","Colombo","Enterprise IT delivery.",15],
    ["Siti Mariam Yusof","siti.mariam@demo.thequad","ICQA","Cert IV HR",2023,"HR Executive","IHH Healthcare","Healthcare","Malaysia","Kuala Lumpur","Hospital workforce scheduling and relations.",14],
    ["Apenisa Driti","apenisa.d@demo.thequad","EDUK8U","Masters (MBA)",2025,"Commercial Manager","Fiji Ports","Logistics","Fiji","Suva","Ports, logistics and trade facilitation.",12],
    ["Dilrukshi Bandara","dilrukshi.b@demo.thequad","EDUK8U","DBA",2026,"Chief People Officer","Softlogic Life","Finance","Sri Lanka","Colombo","Insurance sector people strategy. DBA candidate.",11],
    ["Raymond Chong","raymond.c@demo.thequad","ICQA","Diploma of Business",2025,"Operations Lead","Grab Malaysia","Logistics","Malaysia","Kuala Lumpur","Last-mile ops and driver partner experience.",9],
    ["Vasiti Lewanavanua","vasiti.l@demo.thequad","ICQA","Diploma of HR",2026,"HR Coordinator","Tourism Fiji","Hospitality","Fiji","Nadi","Tourism workforce programmes.",7],
    ["Imran Shafiq","imran.s@demo.thequad","EDUK8U","Micro-credential: People Analytics",2026,"HR Analyst","Maybank","Finance","Malaysia","Kuala Lumpur","People data and dashboards.",5],
    ["Chamari Gunasekara","chamari.g@demo.thequad","ICQA","Cert IV Training & Assessment",2026,"L&D Specialist","MAS Holdings","Operations","Sri Lanka","Colombo","Designing shop-floor training academies.",3],
  ];
  for (const m of members) {
    await insUser({
      name: m[0], email: m[1], hash: demoHash, role: "member", brand: m[2], programme: m[3],
      grad_year: m[4], job_title: m[5], company: m[6], industry: m[7], country: m[8], city: m[9],
      linkedin: "https://www.linkedin.com/in/" + m[0].toLowerCase().replace(/[^a-z]+/g, "-"),
      bio: m[10], ago: m[11],
    });
  }

  const uid = {};
  for (const r of await db.all("SELECT id, name FROM users")) uid[r.name] = r.id;

  // Connections
  const pairs = [
    ["Nurul Aina Rahman","Ahmad Faiz Ismail","accepted"],["Nurul Aina Rahman","Priyanka Fernando","accepted"],
    ["Nurul Aina Rahman","Nor Azlina Bakar","accepted"],["Nurul Aina Rahman","Imran Shafiq","accepted"],
    ["Dinesh Jayawardena","Priyanka Fernando","accepted"],["Dinesh Jayawardena","Chamari Gunasekara","accepted"],
    ["Mereani Tuivanuavou","Josaia Waqairatu","accepted"],["Mereani Tuivanuavou","Vasiti Lewanavanua","accepted"],
    ["Josaia Waqairatu","Nurul Aina Rahman","accepted"],["Litia Vakacegu","Mereani Tuivanuavou","accepted"],
    ["Kavindi Wijesinghe","Nurul Aina Rahman","pending"],["Tharindu Silva","Dinesh Jayawardena","pending"],
    ["Winnie Tam","Nurul Aina Rahman","accepted"],["Winnie Tam","Dinesh Jayawardena","accepted"],
  ];
  for (const [a, b, s] of pairs) await db.run("INSERT INTO connections (requester_id,recipient_id,status) VALUES (?,?,?)", [uid[a], uid[b], s]);

  // Posts
  const posts = [
    ["Dinesh Jayawardena","We're expanding the Colombo plant's L&D team — two roles just went up on the jobs board. Happy to refer any alumni who apply. 🎓","",2],
    ["Mereani Tuivanuavou","Sharing: Fiji's National Employment Policy review is open for submissions — relevant for anyone in workforce planning here. Link in comments.","",26],
    ["Nor Azlina Bakar","Just wrapped a pilot of skills-based hiring for our technician intake. AMA — the results surprised our leadership team.","",50],
    ["Winnie Tam","Welcome to The Quad! 🎉 This is the private network for EDUK8U and ICQA graduates. Complete your profile, say hello, and check the KL meetup on the Events page.","",120],
    ["Imran Shafiq","Any alumni using people analytics beyond dashboards? Looking for examples of attrition models actually used in decisions.","",75],
    ["Priyanka Fernando","Proud moment: our graduate trainee cohort — designed around what I learned in the DBA — just hit 92% retention at 18 months.","",100],
    ["Ahmad Faiz Ismail","KL folks: we're hosting a walk-in interview day next month for airport ops roles. DM me for the details before it goes public.","",140],
    ["Raymond Chong","First month applying the ICQA ops framework to our driver onboarding — cut time-to-first-trip by 30%.","",170],
  ];
  for (const [a, b, l, h] of posts) await db.run("INSERT INTO posts (author_id,body,link_url,created_at) VALUES (?,?,?,?)", [uid[a], b, l, hoursAgo(h)]);

  const allIds = Object.values(uid);
  const postRows = await db.all("SELECT id FROM posts ORDER BY id");
  const likeCounts = [24, 11, 15, 30, 7, 22, 9, 12];
  for (let i = 0; i < postRows.length; i++) {
    const n = likeCounts[i] || 5;
    for (let k = 0; k < Math.min(n, allIds.length); k++)
      await db.run("INSERT INTO post_likes VALUES (?,?) ON CONFLICT DO NOTHING", [postRows[i].id, allIds[k]]);
  }
  const insComment = (postId, authorId, body, h) =>
    db.run("INSERT INTO post_comments (post_id,author_id,body,created_at) VALUES (?,?,?,?)", [postId, authorId, body, hoursAgo(h)]);
  await insComment(postRows[0].id, uid["Chamari Gunasekara"], "Both roles are on my team — happy to answer questions about the day-to-day.", 1);
  await insComment(postRows[0].id, uid["Shalini Rajapakse"], "Referred a former colleague. Thanks Dinesh!", 1);
  await insComment(postRows[1].id, uid["Josaia Waqairatu"], "Submission link: fiji.gov.fj/employment-policy-review — closes end of month.", 20);
  await insComment(postRows[3].id, uid["Nurul Aina Rahman"], "Great to be here. KL meetup RSVP'd!", 110);
  await insComment(postRows[4].id, uid["Nor Azlina Bakar"], "We use a simple survival model for technician attrition — happy to walk you through it.", 70);

  // Jobs
  const jobs = [
    ["Ahmad Faiz Ismail","HR Manager, Plantation Division","Sime Darby","Kuala Lumpur","Malaysia","Full-time","RM 12-15k","Human Resources","Lead HR for the plantation division. Hybrid, 2 days on site.","","careers@simedarby.example",1],
    ["Dinesh Jayawardena","L&D Specialist","MAS Holdings","Colombo","Sri Lanka","Full-time","Negotiable","Education & Training","Design and run shop-floor training academies. Referral available from Dinesh.","","ld.recruit@mas.example",2],
    ["Dinesh Jayawardena","Training Officer, Apparel","MAS Holdings","Colombo","Sri Lanka","Full-time","Negotiable","Education & Training","Second of the two L&D roles. Entry to mid-level.","","ld.recruit@mas.example",2],
    ["Winnie Tam","Recruitment Consultant, APAC","Work Ready Asia","Remote","Malaysia","Full-time","Base + commission","Human Resources","Partner company of the alumni network. End-to-end recruitment across hospitality and care roles.","https://workreadyasia.com","",4],
    ["Mereani Tuivanuavou","Compliance Trainer","Fiji National University","Suva","Fiji","Contract","FJ$ 45-55k","Education & Training","12-month contract, VET compliance focus.","","hr@fnu.example",7],
    ["Siti Mariam Yusof","HR Executive, Scheduling","IHH Healthcare","Kuala Lumpur","Malaysia","Full-time","RM 5-7k","Human Resources","Workforce scheduling for two hospitals.","","talent@ihh.example",9],
    ["Peni Cakau","SME Relationship Officer","BSP Financial Group","Lautoka","Fiji","Full-time","Competitive","Finance","SME lending portfolio, western division.","","recruit@bsp.example",12],
    ["Kavindi Wijesinghe","Learning Partner, Banking","Commercial Bank of Ceylon","Colombo","Sri Lanka","Full-time","Negotiable","Finance","Build learning journeys for branch teams.","","careers@combank.example",14],
  ];
  for (const j of jobs) {
    await db.run(`INSERT INTO jobs (poster_id,title,company,location,country,job_type,salary_range,job_function,description,apply_url,apply_email,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [uid[j[0]], j[1], j[2], j[3], j[4], j[5], j[6], j[7], j[8], j[9], j[10], daysAgo(j[11])]);
  }

  // Marketplace listings
  const listings = [
    ["Priyanka Fernando","offer","service","HR policy audit & employee handbook drafting","Full policy review for SMEs, PDPA-aligned. Two-week turnaround.","Consulting, HR","From US$500","Sri Lanka","Colombo",3],
    ["Josaia Waqairatu","offer","service","Leadership workshops for Pacific teams","Half-day and full-day facilitation, in person across Fiji or online.","Training, Leadership","Price on enquiry","Fiji","Suva",5],
    ["Dinesh Jayawardena","offer","product","Ceylon tea hampers, corporate orders","Branded gift hampers for client and staff appreciation, ships APAC-wide.","Corporate gifts","From US$28/unit","Sri Lanka","Colombo",6],
    ["Litia Vakacegu","request","service","Looking for: legal consultant in Brisbane","Contract review for a labour-hire agreement, ideally someone who knows the Fair Work framework.","Legal, Contracts","Budget on enquiry","Australia","Brisbane",0],
    ["Mereani Tuivanuavou","request","product","Looking for: workwear supplier, 200 units","Branded polos and hi-vis for ground crew, delivery to Nadi by November.","Uniforms, Procurement","Budget on enquiry","Fiji","Nadi",2],
    ["Ahmad Faiz Ismail","request","service","Looking for: payroll outsourcing provider in KL","60-headcount company, monthly cycle, needs EPF/SOCSO compliance.","Payroll","RM 2-3k/month","Malaysia","Kuala Lumpur",4],
    ["Winnie Tam","offer","service","Volume hiring & labour supply, APAC","Work Ready Asia, partner company. End-to-end sourcing for hospitality, logistics and care roles.","Recruitment","Partner company","Malaysia","Regional",8],
  ];
  for (const l of listings) {
    await db.run(`INSERT INTO listings (owner_id,kind,category,title,description,tags,price_note,country,city,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`, [uid[l[0]], l[1], l[2], l[3], l[4], l[5], l[6], l[7], l[8], daysAgo(l[9])]);
  }

  // Events
  const evIds = [];
  const e1 = await db.run("INSERT INTO events (title,event_date,location,description,created_by) VALUES (?,?,?,?,?) RETURNING id",
    ["Alumni Meetup — Kuala Lumpur", "2026-09-24 19:00", "Bangsar, KL", "First in-person meetup. Drinks and food on the Alumni Office.", uid["Winnie Tam"]]);
  const e2 = await db.run("INSERT INTO events (title,event_date,location,description,created_by) VALUES (?,?,?,?,?) RETURNING id",
    ["Webinar: AI in HR", "2026-10-08 20:00", "Online", "Live session with Dr Roy Prasad. Q&A included.", uid["Winnie Tam"]]);
  const e3 = await db.run("INSERT INTO events (title,event_date,location,description,created_by) VALUES (?,?,?,?,?) RETURNING id",
    ["Colombo Coffee Morning", "2026-10-17 09:30", "Colombo 03", "Informal catch-up for Sri Lanka alumni.", uid["Priyanka Fernando"]]);
  evIds.push(e1.rows[0].id, e2.rows[0].id, e3.rows[0].id);
  for (const u of allIds.slice(0, 17)) await db.run("INSERT INTO rsvps VALUES (?,?) ON CONFLICT DO NOTHING", [evIds[0], u]);
  for (const u of allIds.slice(3, 14)) await db.run("INSERT INTO rsvps VALUES (?,?) ON CONFLICT DO NOTHING", [evIds[1], u]);
  for (const u of allIds.slice(6, 11)) await db.run("INSERT INTO rsvps VALUES (?,?) ON CONFLICT DO NOTHING", [evIds[2], u]);

  // Mentoring
  const insMp = (name, role, industries, expertise, capacity, note) =>
    db.run("INSERT INTO mentor_profiles (user_id,role,industries,expertise,capacity,note) VALUES (?,?,?,?,?,?)",
      [uid[name], role, industries, expertise, capacity, note]);
  await insMp("Priyanka Fernando", "mentor", "Human Resources, Telecommunications", "HR leadership, Retention strategy", 2, "One conversation a month, senior HR moves.");
  await insMp("Nor Azlina Bakar", "mentor", "Human Resources, Energy", "HR transformation, Skills-based hiring", 2, "");
  await insMp("Dinesh Jayawardena", "mentor", "Operations, Manufacturing", "Lean operations, L&D team building", 1, "");
  await insMp("Josaia Waqairatu", "both", "Telecommunications, People & Culture", "People analytics, Pacific workforce", 2, "");
  await insMp("Peni Cakau", "mentor", "Finance", "Retail banking, SME lending", 1, "");
  await insMp("Imran Shafiq", "mentee", "Human Resources, Finance", "People analytics", 0, "Looking to move from analyst to HRBP.");
  await insMp("Vasiti Lewanavanua", "mentee", "Hospitality", "Workforce programmes", 0, "Early career, keen on programme management.");
  await insMp("Chamari Gunasekara", "mentee", "Operations, Education & Training", "Training academies", 0, "");

  const insMs = (mentor, mentee, goal, status) =>
    db.run("INSERT INTO mentorships (mentor_id,mentee_id,goal_note,status) VALUES (?,?,?,?)", [uid[mentor], uid[mentee], goal, status]);
  await insMs("Priyanka Fernando", "Imran Shafiq", "Move from HR analyst to HRBP within 18 months.", "requested");
  await insMs("Priyanka Fernando", "Vasiti Lewanavanua", "Build confidence running my first workforce programme.", "requested");
  await insMs("Dinesh Jayawardena", "Chamari Gunasekara", "Design our first in-house training academy.", "active");
  await insMs("Josaia Waqairatu", "Nurul Aina Rahman", "", "requested");

  // Messages
  const insMsg = (from, to, body, read, h) =>
    db.run("INSERT INTO messages (sender_id,recipient_id,body,read_at,created_at) VALUES (?,?,?,?,?)",
      [uid[from], uid[to], body, read ? hoursAgo(h) : null, hoursAgo(h)]);
  await insMsg("Ahmad Faiz Ismail", "Nurul Aina Rahman", "Nurul! Saw your post on the GLC panel — are you going to the KL meetup?", true, 30);
  await insMsg("Nurul Aina Rahman", "Ahmad Faiz Ismail", "Yes, already RSVP'd. See you there?", true, 29);
  await insMsg("Ahmad Faiz Ismail", "Nurul Aina Rahman", "Definitely. Also — we have an HRBP opening you'd be perfect for. Sending the JD.", false, 5);
  await insMsg("Priyanka Fernando", "Nurul Aina Rahman", "Thanks for connecting! Your DBA topic sounds close to mine — coffee chat sometime?", false, 12);
  await insMsg("Winnie Tam", "Nurul Aina Rahman", "Welcome to The Quad, Nurul 🎉 Shout if anything looks broken — we're still polishing.", true, 100);

  // Unredeemed invites
  const pending = [
    ["Aisha Binti Omar","aisha.omar@example.com","EDUK8U","Masters (MBA)",2026,"Malaysia"],
    ["Ratu Semi Naikelekele","ratu.semi@example.com","ICQA","Diploma of Business",2026,"Fiji"],
    ["Nadeesha Kumari","nadeesha.k@example.com","EDUK8U","DBA",2026,"Sri Lanka"],
    ["Cheng Mei Ling","meiling.cheng@example.com","ICQA","Cert IV HR",2026,"Malaysia"],
    ["Sekove Tuinamena","sekove.t@example.com","EDUK8U","Micro-credential: Digital Marketing",2026,"Fiji"],
    ["Demo Invite (try redeeming me)","new.member@example.com","EDUK8U","Masters (MBA)",2026,"Malaysia"],
  ];
  for (const p of pending)
    await db.run("INSERT INTO invites (code,name,email,brand,programme,grad_year,country) VALUES (?,?,?,?,?,?,?)", [inviteCode(), ...p]);
  // A fixed, documented demo code:
  await db.run("INSERT INTO invites (code,name,email,brand,programme,grad_year,country) VALUES (?,?,?,?,?,?,?)",
    ["QUAD-DEMO-01", "Fresh Graduate", "fresh.grad@example.com", "ICQA", "Diploma of HR", 2026, "Australia"]);
}

let readyPromise = null;
function ready() {
  if (!readyPromise) {
    readyPromise = pool.query(SCHEMA).then(seed).catch((e) => {
      readyPromise = null; // allow retry on next request
      throw e;
    });
  }
  return readyPromise;
}

module.exports = { db, pool, ready, inviteCode };
