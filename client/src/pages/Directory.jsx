import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../App.jsx";
import { Avatar, Badge, Spinner } from "../ui.jsx";

export default function Directory() {
  const { me } = useAuth();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState(null);
  const [tab, setTab] = useState("");
  const [f, setF] = useState({ programme: "", industry: "", country: "", mentoring: "", q: params.get("q") || "" });
  const [pending, setPending] = useState([]);

  const load = () => {
    const qs = new URLSearchParams();
    if (tab) qs.set("brand", tab);
    for (const [k, v] of Object.entries(f)) if (v) qs.set(k, v);
    api.get(`/members?${qs}`).then(setData);
  };

  useEffect(() => { api.get("/filters").then(setFilters); }, []);
  useEffect(() => { api.get("/connections").then((c) => setPending(c.pending)); }, []);
  useEffect(load, [tab, f]);
  useEffect(() => { setF((old) => ({ ...old, q: params.get("q") || "" })); }, [params]);

  const connect = async (id) => { await api.post(`/connections/${id}`); load(); };
  const actPending = async (id, accept) => {
    await api.put(`/connections/${id}`, { accept });
    api.get("/connections").then((c) => setPending(c.pending));
    load();
  };

  const total = data ? (data.counts.EDUK8U || 0) + (data.counts.ICQA || 0) : 0;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const hasFilters = Object.values(f).some(Boolean) || tab;

  return (
    <div>
      <div className="page-head">
        <h1>Directory</h1>
        <span className="sub">Every member of The Quad, searchable by brand, programme, industry and country.</span>
      </div>

      {pending.length > 0 && (
        <div className="card pending-strip">
          <h4>Connection requests waiting for you</h4>
          {pending.map((p) => (
            <div key={p.connection_id} className="member-row">
              <Avatar name={p.author_name} file={p.author_avatar} size={34} />
              <div className="who">
                <Link to={`/members/${p.author_id}`}><b>{p.author_name}</b></Link>
                <span>{[p.author_job_title, p.author_company].filter(Boolean).join(" · ")}</span>
              </div>
              <button className="btn-mini" onClick={() => actPending(p.connection_id, true)}>Accept</button>
              <button className="btn-mini ghost" onClick={() => actPending(p.connection_id, false)}>Decline</button>
            </div>
          ))}
        </div>
      )}

      <div className="dir-tabs">
        <button className={`dtab ${tab === "" ? "on" : ""}`} onClick={() => setTab("")}>All members{data ? ` · ${total}` : ""}</button>
        <button className={`dtab ${tab === "EDUK8U" ? "on" : ""}`} onClick={() => setTab("EDUK8U")}>EDUK8U{data ? ` · ${data.counts.EDUK8U || 0}` : ""}</button>
        <button className={`dtab ${tab === "ICQA" ? "on" : ""}`} onClick={() => setTab("ICQA")}>ICQA{data ? ` · ${data.counts.ICQA || 0}` : ""}</button>
      </div>

      <div className="filters">
        <input placeholder="Search name, company, role…" value={f.q} onChange={set("q")} style={{ width: 220 }} />
        <select value={f.programme} onChange={set("programme")}>
          <option value="">Programme: all</option>
          {filters?.programmes.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={f.industry} onChange={set("industry")}>
          <option value="">Industry: all</option>
          {filters?.industries.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select value={f.country} onChange={set("country")}>
          <option value="">Country: all</option>
          {filters?.countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={f.mentoring} onChange={set("mentoring")}>
          <option value="">Mentoring: any</option>
          <option value="mentor">Open to mentor</option>
          <option value="mentee">Looking for a mentor</option>
        </select>
        {hasFilters && <button className="clear-f" onClick={() => { setTab(""); setF({ programme: "", industry: "", country: "", mentoring: "", q: "" }); }}>Clear filters</button>}
      </div>

      {data === null ? <Spinner /> : (
        <div className="member-grid">
          {data.members.filter((m) => m.id !== me.id).map((m) => (
            <div key={m.id} className="card mcard">
              <Link to={`/members/${m.id}`}><Avatar name={m.name} file={m.avatar_file} size={54} /></Link>
              <Link to={`/members/${m.id}`}><b>{m.name}</b></Link>
              <div className="role">{[m.job_title, m.company].filter(Boolean).join(" · ") || "—"}</div>
              <Badge brand={m.brand} programme={m.programme} />
              {m.mentoring_role && m.mentoring_role !== "mentee" && <span className="badge b-ok" style={{ marginTop: 4 }}>Open to mentor</span>}
              <div className="loc">{[m.city, m.country].filter(Boolean).join(", ")}</div>
              <div className="mrow-actions">
                {!m.conn_status && <button className="btn sm" onClick={() => connect(m.id)}>Connect</button>}
                {m.conn_status === "pending" && <button className="btn ghost sm" disabled>Pending</button>}
                {m.conn_status === "accepted" && <span className="badge b-ok">Connected</span>}
                {m.conn_status === "declined" && <button className="btn ghost sm" disabled>Declined</button>}
                {m.linkedin_url && <a className="li-btn" href={m.linkedin_url} target="_blank" rel="noreferrer" title="LinkedIn profile">in</a>}
              </div>
            </div>
          ))}
          {data.members.length === 0 && <p style={{ color: "var(--slate)" }}>No members match those filters.</p>}
        </div>
      )}
    </div>
  );
}
