import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, getToken, timeAgo, dateTime } from "../api.js";
import { Spinner, ErrorNote, Toast } from "../ui.jsx";

const TABS = ["Overview", "Invites", "Members", "Content"];

export default function Admin() {
  const [tab, setTab] = useState("Overview");
  return (
    <div>
      <div className="page-head">
        <h1>Admin Panel</h1>
        <span className="sub">Invites, members and content — built for a team of two.</span>
      </div>
      <div className="dir-tabs">
        {TABS.map((t) => (
          <button key={t} className={`dtab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {tab === "Overview" && <Overview />}
      {tab === "Invites" && <Invites />}
      {tab === "Members" && <Members />}
      {tab === "Content" && <Content />}
    </div>
  );
}

function Overview() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/admin/stats").then(setStats); }, []);
  if (!stats) return <Spinner />;
  const items = [
    ["Members joined", stats.members], ["Invites unredeemed", stats.invites_pending],
    ["Live job posts", stats.jobs_live], ["Live listings", stats.listings_live],
    ["Feed posts", stats.posts], ["RSVPs · next event", stats.rsvps_next],
  ];
  return (
    <>
      <div className="stat-row">
        {items.map(([k, v]) => (
          <div key={k} className="card stat"><div className="v">{v}</div><div className="k">{k}</div></div>
        ))}
      </div>
      <div className="card pbox">
        <h4>Weekly routine (5 minutes)</h4>
        <p style={{ fontSize: 13, color: "var(--slate)" }}>
          1. Invites tab — import any new graduates, send codes via GHL/WhatsApp. 2. Content tab — skim new posts,
          jobs and listings, remove anything off. 3. Events — keep at least one upcoming event live so the
          homepage rail never looks empty.
        </p>
      </div>
    </>
  );
}

function Invites() {
  const [invites, setInvites] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", brand: "EDUK8U", programme: "", grad_year: "", country: "" });
  const [csvResult, setCsvResult] = useState(null);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const fileRef = useRef(null);

  const load = () => api.get("/admin/invites").then(setInvites);
  useEffect(() => { load(); }, []);

  const addOne = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/admin/invites", form);
      setForm({ ...form, name: "", email: "" });
      load();
    } catch (ex) { setErr(ex.message); }
  };

  const importCsv = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setErr(""); setCsvResult(null);
      try {
        const r = await api.post("/admin/invites/import", { csv: reader.result });
        setCsvResult(r);
        load();
      } catch (ex) { setErr(ex.message); }
    };
    reader.readAsText(f);
    e.target.value = "";
  };

  const exportCsv = async () => {
    const res = await fetch("/api/admin/invites/export", { headers: { Authorization: `Bearer ${getToken()}` } });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "quad-invites.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const revoke = async (id) => { await api.del(`/admin/invites/${id}`); load(); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // The Quad has no mail provider, so creating an invite only mints the code — nothing is
  // emailed. These two hand the code to the alumni office ready to send.
  const inviteText = (i) =>
    `Hi ${i.name},\n\n` +
    `You're invited to The Quad, the private alumni network for EDUK8U and ICQA graduates.\n\n` +
    `Go to ${window.location.origin}/login, choose "Redeem invite", and enter this code:\n\n` +
    `    ${i.code}\n\n` +
    `The code works once and is tied to your email (${i.email}).\n\n` +
    `See you inside,\nThe Alumni Office`;

  const sendInvite = (i) => {
    const url = `mailto:${encodeURIComponent(i.email)}` +
      `?subject=${encodeURIComponent("Your invite to The Quad")}` +
      `&body=${encodeURIComponent(inviteText(i))}`;
    window.open(url, "_blank", "noopener");
    navigator.clipboard?.writeText(inviteText(i)).catch(() => {});
    setToast(`Opening your email app for ${i.email}. The invite text is also copied to your clipboard.`);
  };

  const copyInvite = (i) => {
    navigator.clipboard?.writeText(inviteText(i)).catch(() => {});
    setToast(`Invite for ${i.name} copied — paste it into email or WhatsApp.`);
  };

  return (
    <>
      <div className="card pbox" style={{ marginBottom: 16 }}>
        <h4>Import alumni CSV</h4>
        <p style={{ fontSize: 12.5, color: "var(--slate)", marginBottom: 10 }}>
          Header row must be: <code>name,email,brand,programme,grad_year,country</code> (grad_year and country optional).
          One invite code is generated per row. Send codes by email or WhatsApp — export below gives you the full list.
        </p>
        <ErrorNote msg={err} />
        {csvResult && (
          <div className="card" style={{ padding: "10px 14px", marginBottom: 10, fontSize: 12.5 }}>
            Created <b>{csvResult.created}</b> invites.
            {csvResult.skipped.length > 0 && <> Skipped {csvResult.skipped.length}: {csvResult.skipped.slice(0, 5).join("; ")}{csvResult.skipped.length > 5 ? "…" : ""}</>}
          </div>
        )}
        <button className="btn" onClick={() => fileRef.current.click()}>Upload CSV</button>{" "}
        <button className="btn ghost" onClick={exportCsv}>Export all codes (CSV)</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={importCsv} />
      </div>

      <form className="card pbox" style={{ marginBottom: 16 }} onSubmit={addOne}>
        <h4>Add a single invite</h4>
        <div className="form-row">
          <div className="field"><label>Name *</label><input value={form.name} onChange={set("name")} required /></div>
          <div className="field"><label>Email *</label><input type="email" value={form.email} onChange={set("email")} required /></div>
          <div className="field">
            <label>Brand *</label>
            <select value={form.brand} onChange={set("brand")}><option>EDUK8U</option><option>ICQA</option></select>
          </div>
          <div className="field"><label>Programme *</label><input value={form.programme} onChange={set("programme")} required placeholder="DBA / Cert IV HR / …" /></div>
          <div className="field"><label>Graduation year</label><input value={form.grad_year} onChange={set("grad_year")} /></div>
          <div className="field"><label>Country</label><input value={form.country} onChange={set("country")} /></div>
        </div>
        <button className="btn">Create invite code</button>
        <p style={{ fontSize: 12.5, color: "var(--slate)", marginTop: 10 }}>
          Creating an invite mints the code only — The Quad does not email it. Use <b>Email invite</b> in the
          table below to open a pre-written message, or <b>Copy</b> to paste it into WhatsApp.
        </p>
      </form>

      <div className="card" style={{ padding: "8px 6px" }}>
        <div className="table-wrap">
          {invites === null ? <Spinner /> : (
            <table className="adm">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Brand · Programme</th><th>Code</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={i.id}>
                    <td><b>{i.name}</b></td>
                    <td>{i.email}</td>
                    <td>{i.brand} · {i.programme}</td>
                    <td className="mono">{i.code}</td>
                    <td>
                      {i.status === "redeemed" && <span className="pill ok">Redeemed{i.redeemed_name ? ` · ${i.redeemed_name}` : ""}</span>}
                      {i.status === "sent" && <span className="pill sent">Awaiting send</span>}
                      {i.status === "revoked" && <span className="pill off">Revoked</span>}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {i.status === "sent" && (
                        <>
                          <button className="link-btn" onClick={() => sendInvite(i)}>Email invite</button>
                          {" · "}
                          <button className="link-btn" onClick={() => copyInvite(i)}>Copy</button>
                          {" · "}
                          <button className="link-btn red" onClick={() => revoke(i.id)}>Revoke</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Toast msg={toast} onDone={() => setToast("")} />
    </>
  );
}

// Members who asked to reset their password. No mail provider is wired up, so the
// alumni office reads the code off this list and passes it to the member.
function ResetRequests() {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.get("/admin/password-resets").then(setRows).catch(() => setRows([])); }, []);

  if (rows === null || rows.length === 0) return null;
  return (
    <div className="card" style={{ padding: "14px 16px", marginBottom: 14 }}>
      <h4 style={{ fontSize: 13, marginBottom: 4 }}>Password reset requests</h4>
      <p style={{ fontSize: 12, color: "var(--slate)", marginBottom: 10 }}>
        Give the member their code. Each one works once and expires after 24 hours.
      </p>
      <div className="table-wrap">
        <table className="adm">
          <thead><tr><th>Member</th><th>Email</th><th>Reset code</th><th>Requested</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.token}>
                <td><b>{r.name}</b></td>
                <td>{r.email}</td>
                <td><code>{r.token}</code></td>
                <td>{dateTime(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Members() {
  const [members, setMembers] = useState(null);
  const load = () => api.get("/admin/members").then(setMembers);
  useEffect(() => { load(); }, []);

  const setActive = async (id, active) => {
    if (!active && !confirm("Deactivate this member? They won't be able to sign in and disappear from the directory.")) return;
    await api.put(`/admin/members/${id}`, { active }); load();
  };
  const setRole = async (id, role) => {
    if (role === "admin" && !confirm("Make this member an admin? They'll see the Admin Panel.")) return;
    await api.put(`/admin/members/${id}`, { role }); load();
  };

  return (
    <>
    <ResetRequests />
    <div className="card" style={{ padding: "8px 6px" }}>
      <div className="table-wrap">
        {members === null ? <Spinner /> : (
          <table className="adm">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Brand · Programme</th><th>Role</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td><Link to={`/members/${m.id}`}><b>{m.name}</b></Link></td>
                  <td>{m.email}</td>
                  <td>{m.brand} · {m.programme}</td>
                  <td>{m.role === "admin" ? <span className="pill ok">Admin</span> : "Member"}</td>
                  <td>{m.active ? <span className="pill ok">Active</span> : <span className="pill off">Deactivated</span>}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {m.active
                      ? <button className="link-btn red" onClick={() => setActive(m.id, false)}>Deactivate</button>
                      : <button className="link-btn" onClick={() => setActive(m.id, true)}>Reactivate</button>}
                    {" · "}
                    {m.role === "member"
                      ? <button className="link-btn" onClick={() => setRole(m.id, "admin")}>Make admin</button>
                      : <button className="link-btn" onClick={() => setRole(m.id, "member")}>Remove admin</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
    </>
  );
}

function Content() {
  const [data, setData] = useState(null);
  const load = () => Promise.all([api.get("/feed"), api.get("/jobs"), api.get("/listings")])
    .then(([posts, jobs, listings]) => setData({ posts, jobs, listings }));
  useEffect(() => { load(); }, []);

  const del = async (kind, id) => {
    if (!confirm("Remove this item? This can't be undone.")) return;
    await api.del(`/${kind}/${id}`); load();
  };

  if (!data) return <Spinner />;
  return (
    <div className="card" style={{ padding: "8px 6px" }}>
      <div className="table-wrap">
        <table className="adm">
          <thead><tr><th>Type</th><th>Content</th><th>By</th><th>When</th><th></th></tr></thead>
          <tbody>
            {data.posts.map((p) => (
              <tr key={`p${p.id}`}>
                <td><span className="pill sent">Post</span></td>
                <td style={{ maxWidth: 380 }}>{p.body.slice(0, 110)}{p.body.length > 110 ? "…" : ""}</td>
                <td>{p.author_name}</td><td>{timeAgo(p.created_at)}</td>
                <td><button className="link-btn red" onClick={() => del("posts", p.id)}>Remove</button></td>
              </tr>
            ))}
            {data.jobs.map((j) => (
              <tr key={`j${j.id}`}>
                <td><span className="pill ok">Job</span></td>
                <td><b>{j.title}</b> · {j.company}</td>
                <td>{j.author_name}</td><td>{timeAgo(j.created_at)}</td>
                <td><button className="link-btn red" onClick={() => del("jobs", j.id)}>Remove</button></td>
              </tr>
            ))}
            {data.listings.map((l) => (
              <tr key={`l${l.id}`}>
                <td><span className="pill off">{l.kind}</span></td>
                <td><b>{l.title}</b></td>
                <td>{l.author_name}</td><td>{timeAgo(l.created_at)}</td>
                <td><button className="link-btn red" onClick={() => del("listings", l.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
