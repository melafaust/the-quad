import React, { useEffect, useRef, useState } from "react";
import { NavLink, Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { api, setToken } from "./api.js";
import { useAuth } from "./App.jsx";

/* ---------- icons ---------- */
const PATHS = {
  home: "M3 10.5L12 3l9 7.5M5 9.5V21h14V9.5",
  users: "M9 11.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M17.5 11.5a2.5 2.5 0 100-5M16.5 14.5c3 .3 5 2.4 5 5.5",
  briefcase: "M3 7h18v13H3zM9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 12h18",
  store: "M4 4h16l-1.5 5.5a2.8 2.8 0 01-5.3.4A2.8 2.8 0 0112 12a2.8 2.8 0 01-1.2-2.1 2.8 2.8 0 01-5.3-.4L4 4zM5 12v8h14v-8M10 20v-5h4v5",
  mentor: "M12 11a4 4 0 100-8 4 4 0 000 8zM6 21v-1a6 6 0 0112 0v1M17.5 3.5L19 2M20 7h2M4.5 3.5L3 2M2 7h2",
  calendar: "M3 5h18v16H3zM8 3v4M16 3v4M3 10h18",
  chat: "M21 12a8 8 0 01-8 8H5l-2 2V12a8 8 0 018-8h2a8 8 0 018 8z",
  shield: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.3-4.3",
  bell: "M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0",
  camera: "M4 8h3l2-3h6l2 3h3v12H4V8zM12 16.4a3.4 3.4 0 100-6.8 3.4 3.4 0 000 6.8z",
  like: "M7 10v11H3V10h4zm0 0l4-7a2.4 2.4 0 012.5 2.4V9H20a2 2 0 012 2.3l-1.4 7A2 2 0 0118.6 20H7",
  photo: "M3 3h18v18H3zM8.5 10.2a1.7 1.7 0 100-3.4 1.7 1.7 0 000 3.4zM21 15l-5-5L5 21",
  link: "M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7",
  pin: "M12 21s7-6.1 7-11a7 7 0 10-14 0c0 4.9 7 11 7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  download: "M12 3v12m0 0l-4-4m4 4l4-4M4 17v3a1 1 0 001 1h14a1 1 0 001-1v-3",
  x: "M6 6l12 12M18 6L6 18",
  check: "M4 12l6 6L20 6",
  plus: "M12 5v14M5 12h14",
  out: "M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3",
  edit: "M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4",
};
export const Icon = ({ name, size = 16, stroke = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {PATHS[name].split("M").filter(Boolean).map((p, i) => <path key={i} d={"M" + p} />)}
  </svg>
);

/* ---------- brand marks (recreated from supplied logos) ---------- */
export const EMark = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" aria-label="EDUK8U">
    <circle cx="50" cy="50" r="38" fill="none" stroke="#203864" strokeWidth="21"
      strokeDasharray="202.2 36.6" transform="rotate(27.5 50 50)" />
    <rect x="34" y="42.5" width="54" height="15" rx="2" fill="#203864" />
    <circle cx="11" cy="50" r="13" fill="#FFFFFF" />
    <circle cx="11" cy="50" r="8" fill="#F26430" />
  </svg>
);
export const IMark = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" aria-label="ICQA">
    <path d="M36 26 A38 38 0 0 0 36 94" fill="none" stroke="#F26430" strokeWidth="9" strokeLinecap="round" />
    <path d="M22 34 A40 40 0 0 1 80 30" fill="none" stroke="#203864" strokeWidth="4" strokeLinecap="round" />
    <path d="M10 22 L50 6 L90 22 L50 38 Z" fill="#203864" />
    <path d="M76 27 l2 14" stroke="#203864" strokeWidth="3" strokeLinecap="round" />
    <circle cx="79" cy="44" r="3.5" fill="#203864" />
    <circle cx="50" cy="52" r="10" fill="#F26430" />
    <path d="M42 66 L58 62 L58 94 L42 94 Z" fill="#203864" />
  </svg>
);

/* ---------- avatar + badge ---------- */
const GRADS = [
  ["#0EA5E9", "#0369A1"], ["#F59E0B", "#D97706"], ["#8B5CF6", "#6D28D9"],
  ["#10B981", "#047857"], ["#F43F5E", "#BE123C"], ["#6366F1", "#4338CA"],
];
export function Avatar({ name = "?", file = "", size = 40 }) {
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const g = GRADS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADS.length];
  const style = { width: size, height: size, fontSize: size * 0.34 };
  if (file) return <img className="avatar" src={file} alt={name} style={style} />;
  return <span className="avatar" style={{ ...style, background: `linear-gradient(135deg,${g[0]},${g[1]})` }}>{initials}</span>;
}

export const Badge = ({ brand, programme, year }) => (
  <span className={`badge ${brand === "ICQA" ? "b-icqa" : "b-edu"}`}>
    {brand}{programme ? ` · ${programme.replace("Micro-credential: ", "MC: ")}` : ""}{year ? ` ${year}` : ""}
  </span>
);

export const Spinner = () => <div className="spinner">Loading…</div>;
export const ErrorNote = ({ msg }) => (msg ? <div className="error-note">{msg}</div> : null);

/* ---------- toast ---------- */
export function Toast({ msg, onDone, ms = 5000 }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, ms);
    return () => clearTimeout(t);
  }, [msg, ms, onDone]);
  if (!msg) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <Icon name="check" size={15} stroke={2.6} />
      <span>{msg}</span>
      <button className="toast-x" onClick={onDone} aria-label="Dismiss">
        <Icon name="x" size={12} stroke={2.6} />
      </button>
    </div>
  );
}

/* ---------- confirm dialog ---------- */
export function Confirm({ open, title, body, confirmLabel = "Confirm", onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h4>{title}</h4>
        {body && <p>{body}</p>}
        <div className="modal-actions">
          <button className="btn ghost sm" onClick={onCancel}>Cancel</button>
          <button className="btn danger sm" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- notifications bell ---------- */
function Bell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const ref = useRef(null);
  const nav = useNavigate();

  const load = () => Promise.all([api.get("/connections"), api.get("/mentorships")])
    .then(([c, m]) => setData({ conns: c.pending, mentees: m.asMentor.filter((x) => x.status === "requested") }));

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const count = data ? data.conns.length + data.mentees.length : 0;

  const actConn = async (id, accept) => { await api.put(`/connections/${id}`, { accept }); load(); };
  const actMentee = async (id, status) => { await api.put(`/mentorships/${id}`, { status }); load(); };

  return (
    <div className="bell-wrap" ref={ref}>
      <button className="bell" onClick={() => { setOpen(!open); if (!open) load(); }} aria-label="Notifications">
        <Icon name="bell" size={17} />
        {count > 0 && <span className="bell-dot" />}
      </button>
      {open && (
        <div className="dropdown">
          <h5>Notifications</h5>
          {data && count === 0 && <p className="dd-empty">You're all caught up.</p>}
          {data?.conns.map((c) => (
            <div key={c.connection_id} className="dd-row">
              <Avatar name={c.author_name} file={c.author_avatar} size={30} />
              <div className="dd-txt"><b>{c.author_name}</b> wants to connect</div>
              <button className="btn-mini" onClick={() => actConn(c.connection_id, true)}>Accept</button>
              <button className="btn-mini ghost" onClick={() => actConn(c.connection_id, false)}>Decline</button>
            </div>
          ))}
          {data?.mentees.map((m) => (
            <div key={m.id} className="dd-row">
              <Avatar name={m.author_name} file={m.author_avatar} size={30} />
              <div className="dd-txt"><b>{m.author_name}</b> requested mentorship{m.goal_note ? ` — "${m.goal_note}"` : ""}</div>
              <button className="btn-mini" onClick={() => actMentee(m.id, "active")}>Accept</button>
              <button className="btn-mini ghost" onClick={() => actMentee(m.id, "declined")}>Decline</button>
            </div>
          ))}
          <button className="dd-foot" onClick={() => { setOpen(false); nav("/mentoring"); }}>Open mentoring →</button>
        </div>
      )}
    </div>
  );
}

/* ---------- layout: top bar + left rail ---------- */
export function Layout() {
  const { me, refreshMe } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");
  const [unread, setUnread] = useState(0);
  const [confirmOut, setConfirmOut] = useState(false);
  const fileRef = useRef(null);

  const signOut = () => { setToken(null); window.location.href = "/login"; };

  useEffect(() => { api.get("/messages/unread-count").then((r) => setUnread(r.unread)).catch(() => {}); }, [location]);

  const uploadAvatar = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("avatar", f);
    try { await api.upload("/me/avatar", fd); refreshMe(); } catch (err) { alert(err.message); }
    e.target.value = "";
  };

  const NAV = [
    ["/", "home", "Home"], ["/directory", "users", "Directory"], ["/jobs", "briefcase", "Jobs"],
    ["/marketplace", "store", "Marketplace"], ["/mentoring", "mentor", "Mentoring"],
    ["/events", "calendar", "Events"], ["/messages", "chat", "Messages"],
  ];

  return (
    <div className="shell">
      <nav className="topbar">
        <a className="brandchip" href="https://eduk8u.com" target="_blank" rel="noreferrer" title="EDUK8U">
          <EMark />
          <span className="bt"><b>EDUK8U</b><small>Upskilling <i>|</i> Reskilling</small></span>
        </a>
        <Link to="/" className="wordmark">The Quad</Link>
        <form className="searchbox" onSubmit={(e) => { e.preventDefault(); nav(`/directory?q=${encodeURIComponent(q)}`); }}>
          <Icon name="search" size={13} stroke={2.4} />
          <input placeholder="Search members, companies, roles…" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <div className="top-right">
          <Bell />
          <Link to="/profile" title="My profile"><Avatar name={me.name} file={me.avatar_file} size={32} /></Link>
          <a className="brandchip" href="https://icqa.qld.edu.au" target="_blank" rel="noreferrer" title="ICQA">
            <IMark />
            <span className="bt"><b className="icqa-name">ICQA</b><small>RTO No: 46584</small></span>
          </a>
        </div>
      </nav>

      <div className="page">
        <aside className="rail-left">
          <div className="card nav-card">
            <svg className="ghost-e" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="38" fill="none" stroke="#203864" strokeWidth="21"
                strokeDasharray="202.2 36.6" transform="rotate(27.5 50 50)" />
              <rect x="34" y="42.5" width="54" height="15" rx="2" fill="#203864" />
              <circle cx="11" cy="50" r="8" fill="#F26430" />
            </svg>
            <nav className="navrail">
              {NAV.map(([to, icon, label]) => (
                <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "on" : "")}>
                  <Icon name={icon} /> {label}
                  {label === "Messages" && unread > 0 && <span className="notif">{unread}</span>}
                </NavLink>
              ))}
              {me.role === "admin" && (
                <>
                  <hr className="nav-sep" />
                  <NavLink to="/admin" className={({ isActive }) => "admin" + (isActive ? " on" : "")}>
                    <Icon name="shield" size={15} /> Admin Panel <span className="admin-chip">Admins</span>
                  </NavLink>
                </>
              )}
            </nav>
          </div>

          <div className="card mini-profile">
            <span className="av-wrap">
              <Avatar name={me.name} file={me.avatar_file} size={46} />
              <button className="cam" title="Upload profile photo" onClick={() => fileRef.current.click()}>
                <Icon name="camera" size={10} stroke={2.4} />
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={uploadAvatar} />
            </span>
            <div className="mini-id">
              <Link to="/profile"><b>{me.name}</b></Link>
              <div className="role">{[me.job_title, me.company].filter(Boolean).join(" · ") || "Complete your profile"}</div>
              <Badge brand={me.brand} programme={me.programme} />
            </div>
            <button className="signout" onClick={() => setConfirmOut(true)}>
              <Icon name="out" size={14} /> Sign out
            </button>
          </div>
        </aside>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <Confirm
        open={confirmOut}
        title="Sign out of The Quad?"
        body="You'll need to sign in again with your email and password."
        confirmLabel="Sign out"
        onConfirm={signOut}
        onCancel={() => setConfirmOut(false)}
      />
    </div>
  );
}
