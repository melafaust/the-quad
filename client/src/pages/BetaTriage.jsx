const CHIP = {
  high:     { background: "#fee2e2", color: "#991b1b" },
  medium:   { background: "#fef9c3", color: "#854d0e" },
  low:      { background: "#f3f4f6", color: "#6b7280" },
  fixed:    { background: "#d1fae5", color: "#065f46" },
  partial:  { background: "#fef3c7", color: "#92400e" },
  pending:  { background: "#fef3c7", color: "#92400e" },
  bug:      { background: "#fee2e2", color: "#991b1b" },
  feature:  { background: "#eff6ff", color: "#1d4ed8" },
  strategic:{ background: "#f3e8ff", color: "#7c3aed" },
};

function Chip({ type, children }) {
  return (
    <span style={{
      ...CHIP[type] || CHIP.low,
      fontSize: 11, fontWeight: 700, padding: "2px 8px",
      borderRadius: 4, whiteSpace: "nowrap", display: "inline-block",
    }}>{children}</span>
  );
}

function PendingBadge() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 700, color: "#92400e",
      background: "#fef3c7", borderRadius: 4, padding: "2px 8px" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#d97706", display: "inline-block" }} />
      Pending
    </span>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: "normal", margin: 0 }}>{title}</h2>
      {subtitle && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>{subtitle}</div>}
    </div>
  );
}

function Banner({ color, icon, title, body }) {
  const colors = {
    green:  { bg: "#f0fdf4", border: "#bbf7d0", title: "#065f46" },
    amber:  { bg: "#fffbeb", border: "#fde68a", title: "#92400e" },
  };
  const c = colors[color];
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8,
      padding: "12px 16px", marginBottom: 16, display: "flex", gap: 12, fontSize: 13 }}>
      <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div><strong style={{ color: c.title, display: "block", marginBottom: 2 }}>{title}</strong>{body}</div>
    </div>
  );
}

function Table({ cols, rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff",
        border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", fontSize: 13 }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} style={{ background: "#f9fafb", padding: "8px 12px", textAlign: "left",
                fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase",
                color: "#6b7280", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid #f3f4f6" : "none" }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "9px 12px", verticalAlign: "top" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "#e5e7eb", margin: "36px 0" }} />;
}

function StrategyCard({ title, body, footer }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.3 }}>{title}</span>
        <Chip type="strategic">Strategic</Chip>
      </div>
      <div style={{ fontSize: 12.5, color: "#6b7280", lineHeight: 1.5 }}>{body}</div>
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f3f4f6", fontSize: 11.5, color: "#6b7280" }}>
        <strong style={{ color: "#92400e" }}>★ Awaiting Winnie's direction</strong> — {footer}
      </div>
    </div>
  );
}

export default function BetaTriage() {
  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 0 60px" }}>

      {/* Header */}
      <div style={{ background: "#1C3557", color: "#fff", padding: "24px 28px 20px", borderRadius: "0 0 12px 12px", marginBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>EDUK8U · The Quad</div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: "normal", margin: 0 }}>Beta Testing — Feedback Triage &amp; Action Register</h1>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Compiled 16 July 2026 · 6 testers · 35 items logged</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700,
              background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 4, padding: "4px 10px", color: "#fde68a" }}>
              ★ Items marked ★ require Winnie's sign-off before dev proceeds
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 18, flexWrap: "wrap" }}>
          {[
            ["#3DAA6A", "7", "Already Fixed / In Progress"],
            ["#E05555", "15", "Open Bugs (dev-ready)"],
            ["#E89B20", "22", "Feature Requests — Needs Winnie's Go-Ahead"],
            ["#B888FF", "5",  "Strategic Proposals — Winnie's Decision"],
          ].map(([dot, n, label]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 7,
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 6, padding: "6px 12px", fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, display: "inline-block", flexShrink: 0 }} />
              <strong style={{ color: "#fff", fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{n}</strong>
              {label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "32px 4px 0" }}>

        {/* ── SECTION 1: FIXED ── */}
        <SectionHeader title="Already Addressed" subtitle="Fixed in the current dev session or confirmed resolved by automated tests" />
        <Banner color="green" icon="✔" title="Context"
          body="These items were resolved during the platform migration and test-suite work. Tests run daily and results are visible in the App Health Dashboard (/test-dashboard)." />
        <Table
          cols={["ID", "Pillar", "Issue", "Type", "Severity", "Status", "Tester"]}
          rows={[
            ["TC1 / #1", "Directory", <><strong>Country filter returns error screen</strong><br/><small style={{color:"#9ca3af"}}>Filter by UK → error page. API was returning wrong shape.</small></>, <Chip type="bug">Bug</Chip>, <Chip type="high">High</Chip>, <Chip type="fixed">✓ Fixed</Chip>, "Joanne / Rubini"],
            ["TC17 / #17", "Profiles", <><strong>CV upload does not persist after page refresh</strong><br/><small style={{color:"#9ca3af"}}>Wired to Supabase Storage — needs <em>cvs</em> bucket created in dashboard to fully activate.</small></>, <Chip type="bug">Bug</Chip>, <Chip type="high">High</Chip>, <Chip type="partial">⚡ Partial</Chip>, "Kathleen"],
            ["TC23 / #23 #28", "Jobs", <><strong>Apply by Email not working / opens in same tab</strong><br/><small style={{color:"#9ca3af"}}>Now validated to output mailto: link. Regression test passing.</small></>, <Chip type="bug">Bug</Chip>, <Chip type="high">High</Chip>, <Chip type="fixed">✓ Fixed</Chip>, "Kathleen / Joanne"],
            ["TC24 / #24", "Directory", <><strong>LinkedIn icon gives 404 (Dinesh Jayawardena)</strong><br/><small style={{color:"#9ca3af"}}>Tests now validate all linkedin_url values. Data cleanup needed for specific record.</small></>, <Chip type="bug">Bug</Chip>, <Chip type="high">High</Chip>, <Chip type="partial">⚡ Partial</Chip>, "Joanne"],
            ["#32", "Directory", <><strong>Duplicate "Malaysia" / "MALAYSIA" in country filter</strong><br/><small style={{color:"#9ca3af"}}>Case mismatch fixed — standardisation applied in DB queries.</small></>, <Chip type="bug">Bug</Chip>, <Chip type="medium">Medium</Chip>, <Chip type="fixed">✓ Fixed</Chip>, "Ling"],
            ["—", "Platform", <><strong>App only ran locally — not accessible on the web</strong><br/><small style={{color:"#9ca3af"}}>Full migration to Supabase Postgres + Storage + Vercel deployment completed.</small></>, <Chip type="bug">Bug</Chip>, <Chip type="high">High</Chip>, <Chip type="fixed">✓ Fixed</Chip>, "—"],
            ["—", "Admin", <><strong>App Health Dashboard created</strong><br/><small style={{color:"#9ca3af"}}>Automated regression tests run daily and on-demand, visible at /test-dashboard.</small></>, <Chip type="feature">Feature</Chip>, <Chip type="medium">Medium</Chip>, <Chip type="fixed">✓ Done</Chip>, "—"],
          ]}
        />

        <Divider />

        {/* ── SECTION 2: OPEN BUGS ── */}
        <SectionHeader title="Open Bugs" subtitle="Dev-ready — no approval needed, proceed to fix" />
        <Table
          cols={["ID", "Pillar", "Issue", "Severity", "Reported By"]}
          rows={[
            ["#11", "Admin Panel", <><strong>"WHEN" column shows "Invalid Date" in Content Moderation</strong><br/><small style={{color:"#9ca3af"}}>All posts and job entries show "Invalid Date" instead of timestamp.</small></>, <Chip type="medium">Medium</Chip>, "Kathleen"],
            ["#18", "Jobs", <><strong>Job listings display "Invalid Date" for posted date</strong><br/><small style={{color:"#9ca3af"}}>Same date rendering bug — likely one root cause across the whole app.</small></>, <Chip type="low">Low</Chip>, "Kathleen"],
            ["Mona/Rubs", "Home", <><strong>No dates showing on comments and posts</strong><br/><small style={{color:"#9ca3af"}}>Post and comment timestamps not rendering.</small></>, <Chip type="low">Low</Chip>, "Rubini / Ling"],
            ["Kash", "Messages", <><strong>Message thread shows "Invalid Date"</strong><br/><small style={{color:"#9ca3af"}}>Thread header / message timestamp displays invalid date.</small></>, <Chip type="low">Low</Chip>, "Kashini"],
            ["#3", "Admin Panel", <><strong>CSV member upload fails if email has trailing spaces</strong><br/><small style={{color:"#9ca3af"}}>Fails silently — no error shown to admin.</small></>, <Chip type="medium">Medium</Chip>, "Moganah"],
            ["Mona", "Home", <><strong>Duplicate posts — content posted twice on submit</strong><br/><small style={{color:"#9ca3af"}}>Posting any content creates two identical entries in the feed.</small></>, <Chip type="high">High</Chip>, "Moganah"],
            ["Mona/Rubs", "Directory", <><strong>Connect button not responding</strong><br/><small style={{color:"#9ca3af"}}>Clicking Connect does nothing for some users.</small></>, <Chip type="high">High</Chip>, "Moganah / Rubini"],
            ["Mona/Rubs", "Events", <><strong>RSVP button not working</strong><br/><small style={{color:"#9ca3af"}}>No response or confirmation. Attendee list not captured for admin view.</small></>, <Chip type="high">High</Chip>, "Moganah / Rubini / Kashini"],
            ["Mona", "Platform", <><strong>Search function not working</strong><br/><small style={{color:"#9ca3af"}}>Search bar returns no results or no response.</small></>, <Chip type="high">High</Chip>, "Moganah"],
            ["Mona", "Platform", <><strong>Wrong logo displayed</strong><br/><small style={{color:"#9ca3af"}}>Needs replacement with correct EDUK8U / The Quad branding.</small></>, <Chip type="medium">Medium</Chip>, "Moganah"],
            ["#26", "Directory", <><strong>Programme filter shows non-current courses</strong><br/><small style={{color:"#9ca3af"}}>Includes courses no longer delivered. Needs data update.</small></>, <Chip type="high">High</Chip>, "Joanne"],
            ["#27", "Directory", <><strong>"Open to Mentor" button does nothing when clicked</strong><br/><small style={{color:"#9ca3af"}}>Looks clickable but has no action. Expected: navigate to mentor profile or contact option.</small></>, <Chip type="high">High</Chip>, "Joanne"],
            ["#20", "Marketplace", <><strong>Listing publishes with blank Country / Description / City</strong><br/><small style={{color:"#9ca3af"}}>Required filter fields not enforced — listings without Country won't appear in filtered results.</small></>, <Chip type="low">Low</Chip>, "Kathleen"],
            ["Kash", "Mentoring", <><strong>Student name not visible in mentoring section</strong><br/><small style={{color:"#9ca3af"}}>After clicking a student profile, the name is not prominently displayed.</small></>, <Chip type="low">Low</Chip>, "Kashini"],
            ["Mona", "Messages", <><strong>Messaging only available after student initiates first</strong><br/><small style={{color:"#9ca3af"}}>Admin/other member cannot start a conversation — only available after the other party messages first.</small></>, <Chip type="medium">Medium</Chip>, "Moganah"],
          ]}
        />

        <Divider />

        {/* ── SECTION 3: FEATURES ── */}
        <SectionHeader title="Feature Requests" subtitle="All items below require Winnie's approval before dev executes" />
        <Banner color="amber" icon="★" title="Pending Winnie's Go-Ahead"
          body="These are enhancements and new behaviours beyond fixing existing functionality. Dev will not proceed on any of these until approved. Winnie to mark each as Approve / Decline / Defer." />
        <Table
          cols={["ID", "Pillar", "Request", "Severity", "Raised By", "Approval"]}
          rows={[
            ["#13", "Gate", <><strong>Add "Forgot Password" / password reset flow</strong><br/><small style={{color:"#9ca3af"}}>No recovery option on login screen — critical once real users onboard.</small></>, <Chip type="medium">Medium</Chip>, "Kathleen", <PendingBadge />],
            ["#14 #25", "Directory", <><strong>Cancel a pending connection request</strong><br/><small style={{color:"#9ca3af"}}>"Pending" button is a dead end — should allow cancellation.</small></>, <Chip type="low">Low</Chip>, "Kathleen / Joanne", <PendingBadge />],
            ["#15", "Directory", <><strong>Confirmation toast when a connect request is sent</strong><br/><small style={{color:"#9ca3af"}}>Button label changes but no messaging on what happens next (does person get notified? how long does it take?).</small></>, <Chip type="low">Low</Chip>, "Kathleen / Joanne", <PendingBadge />],
            ["#16", "Directory", <><strong>Disconnect from an existing connection</strong><br/><small style={{color:"#9ca3af"}}>Once connected, no way to remove. Suggest a "Disconnect" option.</small></>, <Chip type="low">Low</Chip>, "Kathleen", <PendingBadge />],
            ["#12", "Admin Panel", <><strong>Soft-delete / Restore for removed content</strong><br/><small style={{color:"#9ca3af"}}>Content removal is permanent with no undo for posts and jobs.</small></>, <Chip type="low">Low</Chip>, "Kathleen", <PendingBadge />],
            ["Kath", "Admin Panel", <><strong>Audit log for removed content</strong><br/><small style={{color:"#9ca3af"}}>Log what was removed, who removed it, and when — for accountability.</small></>, <Chip type="low">Low</Chip>, "Kathleen", <PendingBadge />],
            ["Mona", "Admin Panel", <><strong>Admin can view and moderate comments</strong><br/><small style={{color:"#9ca3af"}}>Currently only post-level removal is available from Admin Panel.</small></>, <Chip type="medium">Medium</Chip>, "Moganah", <PendingBadge />],
            ["Mona/Rubs", "Jobs", <><strong>Edit a job post after it has been published</strong><br/><small style={{color:"#9ca3af"}}>Delete and re-post is the only current path.</small></>, <Chip type="medium">Medium</Chip>, "Moganah / Rubini", <PendingBadge />],
            ["#19", "Jobs", <><strong>"Remove job" prompt should warn the action is permanent</strong><br/><small style={{color:"#9ca3af"}}>Other remove dialogs have this warning — inconsistency across the app.</small></>, <Chip type="low">Low</Chip>, "Kathleen", <PendingBadge />],
            ["#21", "Marketplace", <><strong>Confirmation / success message on "Mark as Closed"</strong><br/><small style={{color:"#9ca3af"}}>Action completes silently — a toast should confirm the listing is closed.</small></>, <Chip type="low">Low</Chip>, "Kathleen", <PendingBadge />],
            ["Kath", "Marketplace", <><strong>Archive section for closed listings</strong><br/><small style={{color:"#9ca3af"}}>Closed listings disappear entirely — suggest an "Archived Listings" view.</small></>, <Chip type="low">Low</Chip>, "Kathleen", <PendingBadge />],
            ["#29", "Marketplace", <><strong>Pre-filled opening message when contacting a seller</strong><br/><small style={{color:"#9ca3af"}}>A friendly starter message (e.g. "I'm interested in your listing…") would help break the ice.</small></>, <Chip type="low">Low</Chip>, "Joanne", <PendingBadge />],
            ["#2 Mona", "Mentoring", <><strong>Mentor capacity limit + make Industries / Tags required</strong><br/><small style={{color:"#9ca3af"}}>Let mentors cap mentee count. Blank matching fields break the algorithm. Clarify / increase 10-mentee limit.</small></>, <Chip type="low">Low</Chip>, "Moganah / Kathleen", <PendingBadge />],
            ["#30 #31", "Home", <><strong>Character countdown on posts (3,000) and comments (1,000)</strong><br/><small style={{color:"#9ca3af"}}>e.g. "Hi there (8/1000)" — reduces truncation surprises.</small></>, <Chip type="low">Low</Chip>, "Ling", <PendingBadge />],
            ["#33–35", "Messages", <><strong>Profanity filter toggle, chat reporting, and message recall/edit</strong><br/><small style={{color:"#9ca3af"}}>Three message safety / manageability requests — can be scoped individually.</small></>, <Chip type="medium">Medium</Chip>, "Ling", <PendingBadge />],
            ["Kath", "Platform", <><strong>Improve sign-out button — visibility + confirmation prompt</strong><br/><small style={{color:"#9ca3af"}}>Currently small and easy to trigger accidentally.</small></>, <Chip type="low">Low</Chip>, "Kathleen", <PendingBadge />],
            ["Kath", "Platform", <><strong>Report / Flag for regular alumni members (not just admins)</strong><br/><small style={{color:"#9ca3af"}}>Only admins can currently act on inappropriate content.</small></>, <Chip type="medium">Medium</Chip>, "Kathleen", <PendingBadge />],
            ["Kath", "Platform", <><strong>Help Center / FAQ section</strong><br/><small style={{color:"#9ca3af"}}>No support resource for new alumni — especially important for first launch.</small></>, <Chip type="low">Low</Chip>, "Kathleen", <PendingBadge />],
            ["Kath", "Platform", <><strong>Guided onboarding tour / tooltip walkthrough for first-time users</strong></>, <Chip type="low">Low</Chip>, "Kathleen", <PendingBadge />],
            ["Kath", "Platform", <><strong>Terms of Service and Privacy Policy pages</strong><br/><small style={{color:"#9ca3af"}}>Required before broader public rollout.</small></>, <Chip type="medium">Medium</Chip>, "Kathleen", <PendingBadge />],
            ["Mona", "Directory", <><strong>Programme filter cleanup — remove "Alumni" as an option</strong><br/><small style={{color:"#9ca3af"}}>The whole app is for alumni — having "Alumni" as a filter programme is confusing.</small></>, <Chip type="low">Low</Chip>, "Moganah", <PendingBadge />],
            ["Mona", "Home", <><strong>No notifications for likes, comments, or new connections</strong><br/><small style={{color:"#9ca3af"}}>Members receive no in-app or email notifications for any activity.</small></>, <Chip type="medium">Medium</Chip>, "Rubini / Moganah", <PendingBadge />],
          ]}
        />
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 10, paddingTop: 10, borderTop: "1px solid #f3f4f6" }}>
          ★ Dev will not begin work on any feature request until Winnie has reviewed and approved each item.
        </div>

        <Divider />

        {/* ── SECTION 4: STRATEGIC ── */}
        <SectionHeader title="Strategic Proposals" subtitle="Larger-scope ideas that require a decision from Winnie before any scoping begins" />
        <Banner color="amber" icon="★" title="Winnie's Decision Required"
          body="These proposals would meaningfully expand the scope of The Quad. Each is a mini product decision raised primarily by Moganah. No dev work until a direction is confirmed." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          <StrategyCard
            title="Graduation Cohorts & Batches"
            body="Introduce batch/cohort identity — a 'Class of' grouping, convocation countdown, and class reps per batch. With 300+ per cohort, people rally around their batch, not just the directory."
            footer="Scope and timeline TBD"
          />
          <StrategyCard
            title="Chapters & Regional Communities"
            body="Create navigable geographic chapters (Malaysia, Australia, Sri Lanka, Fiji, etc.) for local meetups, referrals, and 'who's near me' discovery — country as a place to go, not just filter."
            footer="Scope TBD"
          />
          <StrategyCard
            title="CPD & Micro-Credentials"
            body="Tie The Quad back to EDUK8U's core product — continuing education content inside the app creates a natural upsell channel that doesn't feel like an ad because it's inside a tool alumni already use."
            footer="Scope TBD"
          />
          <StrategyCard
            title="Success Stories Section"
            body="Repurpose existing alumni testimonials from the website into a Success Stories feed — recognition and engagement for alumni, plus social proof for prospective students browsing the app."
            footer="Low effort if approved"
          />
          <StrategyCard
            title="Rename 'Marketplace' → 'Alumni Marketplace'"
            body="Minor naming change with meaningful clarity impact. 'Marketplace' reads ambiguously next to 'Jobs Board' — 'Alumni Marketplace' signals it's alumni-run businesses and services. Sample HTML shared by Mona."
            footer="Low effort if approved"
          />
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 16 }}>
          Reference: Mona has shared a sample HTML structure for the proposed layout — see the Google Drive link in the original spreadsheet.
        </div>

      </div>
    </div>
  );
}
