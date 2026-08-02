# The Quad

Private alumni network for **EDUK8U** and **ICQA** graduates — directory, feed, jobs,
marketplace, mentoring, events, messages and an admin panel. Invite-only.

Built July 2026. Design system: "Executive Light" (slate canvas, white cards,
navy `#0B1E36`, crimson `#DC2626` accents, blue `#0284C7` actions; brand colours
navy `#203864` / orange `#F26430`).

## Stack

| Layer     | Tech                                        |
|-----------|---------------------------------------------|
| Front-end | React 18 + Vite, plain CSS (`client/`)      |
| API       | Node 22 + Express (`server/`), deployed as a Vercel serverless function |
| Database  | Postgres via Supabase (`DATABASE_URL`)      |
| Auth      | Invite codes → accounts, JWT bearer tokens  |
| Files     | Avatars + CVs in Supabase Storage (`avatars` public bucket, `cvs` private bucket) |

## Run it locally

Copy `.env.example` to `.env` and fill in your Supabase project's `DATABASE_URL`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a `JWT_SECRET`.

```
cd the-quad
npm run setup     # installs server + client dependencies
npm run build     # builds the client into client/dist
npm start         # serves everything at http://localhost:4000
```

For development with hot reload, run two terminals:
`npm run dev:server` (API on :4000) and `npm run dev:client` (Vite on :5173, proxies /api).

## Demo accounts (seeded automatically on first run)

| Who | Email | Password |
|-----|-------|----------|
| Admin (you) | winnie.tam@eduk8u.com | ChangeMe123! |
| Admin (Roy) | roy.prasad@eduk8u.com | ChangeMe123! |
| Member (Nurul) | nurul.rahman@demo.thequad | demo123 |
| Any other demo member | see server/db.js | demo123 |
| Unused invite code | QUAD-DEMO-01 (may already be redeemed from testing) | — |

**Change both admin passwords before anything goes near the internet.**

## Fresh start for production

```
npm run reset-db                       # drops the tables in DATABASE_URL
SEED_DEMO=0 npm start                  # recreates them with ONLY the two admin accounts
```

Then use Admin Panel → Invites → Upload CSV with your real alumni list
(`name,email,brand,programme,grad_year,country`), export the codes, and send
them via your GHL/WhatsApp flows.

## Project layout

```
the-quad/
  server/
    index.js    Express app, static serving of client build + avatars
    auth.js     login, invite redemption, JWT middleware
    api.js      every other endpoint (~40 routes)
    db.js       schema (12 tables) + demo seed
    data/       quad.db, uploads/ (NOT for git — see .gitignore)
  client/
    src/
      styles.css   the whole design system
      ui.jsx       icons, brand marks, avatar, layout (top bar + nav rail)
      pages/       Login, Home, Directory, Member, ProfileEdit, Jobs,
                   Marketplace, Mentoring, Events, Messages, Admin
```

## Handover

Deployment, security hardening and go-live checklist for the developer:
see **DEV_HANDOVER.md**.
