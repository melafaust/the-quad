# DEV_HANDOVER — The Quad

For the developer taking this to production. The app is feature-complete and runs
locally (see README.md). Your job: hosting, security hardening, email, backups.
Estimated effort: 1–2 days for a competent generalist.

## 1. What you're deploying

Single Node process. Express serves the REST API under `/api`, uploaded avatars
under `/uploads/avatars`, and the pre-built React SPA from `client/dist` for every
other route. SQLite database in one file. No external services required to boot.

```
node server/index.js        # PORT env var respected, defaults to 4000
```

## 2. Hosting

Deployed on **Vercel** (frontend static build + API as a serverless function,
see `vercel.json`) with **Supabase** for Postgres and file storage (avatars/CVs).
This replaced the original SQLite + local-disk-uploads design specifically
because Vercel's filesystem is ephemeral — nothing written to disk survives
between requests, so the database and uploads had to move to managed services.

Env vars required in the Vercel project (see `.env.example`): `DATABASE_URL`
(Supabase Transaction pooler string), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`JWT_SECRET`, `SEED_DEMO`.

Suggested domain: `alumni.eduk8u.com` (add as a custom domain in Vercel, CNAME per their instructions).

Alternative: Render/Railway/Fly.io/VPS still work fine for the Express app —
just keep the SQLite+disk version (see git history before this migration) or
point them at the same Supabase Postgres/Storage as above.

## 3. Security

### Already fixed in code (12 Jul 2026, verified by test)

- **URL injection**: member-supplied links (`linkedin_url`, post `link_url`, job
  `apply_url`) are validated server-side, must start with http:// or https://,
  so `javascript:` links can never reach another member's browser.
- **Upload extension spoofing**: stored file extensions derive from the verified
  mimetype (`SAFE_EXT` map in `server/api.js`), never from the client filename —
  a disguised SVG lands as `.png` and cannot execute.
- **Brute force**: `express-rate-limit` on `/api/auth/*`, 10 requests/min/IP.
  If you deploy behind a proxy, set `app.set("trust proxy", 1)` so the limiter
  sees real client IPs, not the proxy's.
- **Headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: same-origin` on every response.

### Still yours to do before go-live

- [ ] **Change both admin passwords** (no self-serve change yet, see §6; re-hash:
      `node -e "const {db}=require('./server/db');const b=require('./server/node_modules/bcryptjs');db.prepare('UPDATE users SET password_hash=? WHERE email=?').run(b.hashSync('NEW_PASSWORD',10),'winnie.tam@eduk8u.com')"`)
- [ ] **Wipe demo data**: `npm run reset-db`, then first boot with `SEED_DEMO=0`.
- [ ] **Set `JWT_SECRET`** env var (any 64+ char random string). Currently a
      generated secret persists in `server/data/secret.key`; env var overrides it.
- [ ] **HTTPS only** (Caddy/nginx or platform TLS). The app itself doesn't redirect.
- [ ] **helmet**: `app.use(require("helmet")({ contentSecurityPolicy: false }))` in
      `server/index.js` for the remaining standard headers (HSTS etc.).
- [ ] **Upload hygiene, next level**: consider re-encoding avatars (sharp) and
      virus-scanning CVs (ClamAV) if budget allows. Type + size + extension are
      already enforced.
- [ ] **Auth token storage**: JWT is kept in localStorage (simple, works, 30-day
      expiry). To harden against XSS token theft, move to an httpOnly cookie +
      SameSite=Lax and add a CSRF token on mutations. Optional at this scale.
- [ ] **Avatar privacy (known trade-off)**: avatar images are served without auth
      so plain `<img>` tags work; filenames are unguessable-ish but not secret.
      CVs are NOT affected (always permission-checked). Route avatars through an
      authenticated endpoint if the client wants them locked down.
- [ ] **Admin 2FA**: consider TOTP for the two admin accounts.
- [ ] **npm audit** both packages and pin/patch anything red.
- [ ] **CORS**: none is enabled — the SPA is same-origin. Don't add permissive CORS.

## 4. Backups

Everything that matters is in `server/data/` (quad.db + uploads/ + secret.key).

- Nightly cron: stop-free SQLite backup with
  `sqlite3 quad.db ".backup quad-$(date +%F).db"` (or just copy the file — WAL mode
  makes plain copies usually fine, the .backup command is safer), plus rsync/rclone
  the uploads folder to object storage (Backblaze B2 is ~free at this size).
- Test a restore once before launch.

## 5. Email (currently manual by design)

The app generates invite codes but does NOT send email — the client sends codes
through their existing GoHighLevel/WhatsApp flows, and that is how they want to
start. If they later want automation:
- Transactional provider: Resend or Postmark (both near-free at this volume).
- Wire into: invite creation (send code), mentorship request (notify mentor),
  new message (daily digest, NOT per-message).
- Password reset (see §6) needs email to exist first.

## 6. Known gaps / sensible next iterations

1. **Password reset & change** — not implemented (no email service yet). Until
   then, an admin can reset a password with the one-liner in §3.
2. **Notifications** are pull-based (bell fetches on open; messages poll every
   12 s). Fine to 1–2k members. WebSockets are an optimisation, not a need.
3. **SQLite → Postgres** only if you outgrow it (thousands of concurrent users).
   Schema is vanilla SQL; better-sqlite3 → pg is a mechanical port.
4. **Search** is SQL LIKE — adequate at 350–2,000 members.
5. **Logo SVGs** in `client/src/ui.jsx` (EMark/IMark) are hand-recreated
   approximations — swap in the real brand vector files when supplied.
6. **Admin cannot edit member profiles** — members own their data; admin can
   deactivate, promote, and remove content.

## 7. Privacy / compliance (client operates in MY, LK, FJ, AU)

The platform holds names, emails, employment details, LinkedIn URLs and CVs of
people in Malaysia (PDPA), Australia (Privacy Act — ICQA is RTO 46584), Sri Lanka
(PDPA No. 9 of 2022) and Fiji.

- [ ] Add a short privacy notice page + a consent line on the invite-redemption
      screen ("By creating an account you agree…"). Legal copy from the client.
- [ ] Honour deletion requests: deactivating a member hides them everywhere;
      full deletion = `DELETE FROM users WHERE id=?` (FKs cascade) + remove their
      upload files.
- [ ] CV files are permission-checked through the API (never statically served) —
      keep it that way.
- [ ] Keep the server region sensibly close (Singapore region covers MY/LK/FJ well).

## 8. Smoke test after each deploy

1. `/login` renders; sign in as admin.
2. Redeem a fresh invite code in a private window → account created.
3. Upload an avatar (JPG) and a CV (PDF); CV download honours visibility.
4. Post to the feed, like, comment; RSVP an event.
5. Admin Panel → stats tiles non-zero; CSV export downloads.

Questions about intent or design decisions: the design pack and hi-fi mockups are
at the artifact links in the project notes; the client (Winnie) has final say on
anything user-facing.
