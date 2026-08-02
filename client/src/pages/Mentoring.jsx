import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../App.jsx";
import { Avatar, Badge, Spinner } from "../ui.jsx";

export default function Mentoring() {
  const { me } = useAuth();
  const nav = useNavigate();
  const [mentors, setMentors] = useState(null);
  const [mine, setMine] = useState(null);
  const [industry, setIndustry] = useState("");
  const [filters, setFilters] = useState(null);
  const [askingId, setAskingId] = useState(null);
  const [goal, setGoal] = useState("");

  const load = () => {
    api.get(`/mentors${industry ? `?industry=${encodeURIComponent(industry)}` : ""}`).then(setMentors);
    api.get("/mentorships").then(setMine);
  };
  useEffect(() => { api.get("/filters").then(setFilters); }, []);
  useEffect(load, [industry]);

  const request = async (mentorId) => {
    try {
      await api.post("/mentorships", { mentor_id: mentorId, goal_note: goal });
      setAskingId(null); setGoal(""); load();
    } catch (ex) { alert(ex.message); }
  };
  const act = async (id, status) => { await api.put(`/mentorships/${id}`, { status }); load(); };

  const pendingIn = mine?.asMentor.filter((m) => m.status === "requested") || [];
  const activeIn = mine?.asMentor.filter((m) => m.status === "active") || [];
  const outgoing = mine?.asMentee || [];

  return (
    <div>
      <div className="page-head">
        <h1>Mentoring</h1>
        <span className="sub">Give back or level up — matched by industry, one conversation at a time.</span>
      </div>

      <div className="home-grid" style={{ gridTemplateColumns: "minmax(0,1fr) 320px" }}>
        <div>
          <div className="card pbox" style={{ marginBottom: 16, background: "linear-gradient(150deg,#0D2340,var(--navy-2))", border: 0 }}>
            <h4 style={{ color: "#FFF" }}>Take part</h4>
            <p style={{ color: "#C7D4E4", fontSize: 13 }}>
              Opt in as a mentor, a mentee, or both — set your industries and capacity, and you'll appear here for the right people.
            </p>
            <div style={{ marginTop: 12 }}>
              <Link to="/profile" className="btn sm on-dark">Set my mentoring preferences</Link>
            </div>
          </div>

          <div className="filters">
            <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
              <option value="">Industry: all</option>
              {filters?.industries.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          {mentors === null ? <Spinner /> : (
            <div className="member-grid">
              {mentors.map((m) => {
                const slots = Math.max(0, m.capacity - m.active_mentees);
                return (
                  <div key={m.user_id} className="card mcard">
                    <Link to={`/members/${m.author_id}`}><Avatar name={m.author_name} file={m.author_avatar} size={54} /></Link>
                    <Link to={`/members/${m.author_id}`}><b>{m.author_name}</b></Link>
                    <div className="role">{[m.author_job_title, m.author_company].filter(Boolean).join(" · ")}</div>
                    <span className="badge b-ok">Mentor · {slots} {slots === 1 ? "slot" : "slots"}</span>
                    <div className="tags" style={{ justifyContent: "center" }}>
                      {(m.industries || "").split(",").filter(Boolean).slice(0, 2).map((t) => <span key={t} className="tag">{t.trim()}</span>)}
                    </div>
                    {m.note && <div className="loc">{m.note}</div>}
                    <div className="mrow-actions" style={{ flexDirection: "column", width: "100%" }}>
                      {m.author_id === me.id ? (
                        <span className="badge b-icqa">This is you</span>
                      ) : m.requested_by_me ? (
                        <button className="btn ghost sm" disabled>Requested</button>
                      ) : slots === 0 ? (
                        <button className="btn ghost sm" disabled>At capacity</button>
                      ) : askingId === m.user_id ? (
                        <div style={{ width: "100%" }}>
                          <textarea style={{ width: "100%", border: "1px solid #CBD5E1", borderRadius: 8, padding: 8, fontSize: 12 }}
                            placeholder="One sentence on your goal…" value={goal} onChange={(e) => setGoal(e.target.value)} />
                          <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "center" }}>
                            <button className="btn sm" onClick={() => request(m.user_id)}>Send</button>
                            <button className="btn ghost sm" onClick={() => setAskingId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button className="btn sm" onClick={() => { setAskingId(m.user_id); setGoal(""); }}>Request mentorship</button>
                      )}
                    </div>
                  </div>
                );
              })}
              {mentors.length === 0 && <p style={{ color: "var(--slate)" }}>No mentors in that industry yet.</p>}
            </div>
          )}
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {pendingIn.length > 0 && (
            <div className="card pbox snip">
              <h4>Requests for you</h4>
              {pendingIn.map((m) => (
                <div key={m.id} style={{ padding: "8px 0", borderTop: "1px solid var(--wash)" }}>
                  <div className="member-row" style={{ padding: 0 }}>
                    <Avatar name={m.author_name} file={m.author_avatar} size={32} />
                    <div className="who">
                      <Link to={`/members/${m.author_id}`}><b>{m.author_name}</b></Link>
                      <span>{[m.author_job_title, m.author_company].filter(Boolean).join(" · ")}</span>
                    </div>
                  </div>
                  {m.goal_note && <p style={{ fontSize: 12, color: "var(--slate)", margin: "6px 0" }}>"{m.goal_note}"</p>}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn-mini" onClick={() => act(m.id, "active")}>Accept</button>
                    <button className="btn-mini ghost" onClick={() => act(m.id, "declined")}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeIn.length > 0 && (
            <div className="card pbox">
              <h4>My mentees</h4>
              {activeIn.map((m) => (
                <div key={m.id} className="member-row">
                  <Avatar name={m.author_name} file={m.author_avatar} size={32} />
                  <div className="who">
                    <Link to={`/members/${m.author_id}`}><b>{m.author_name}</b></Link>
                    <span>{m.goal_note || "Active mentorship"}</span>
                  </div>
                  <button className="btn-mini ghost" onClick={() => nav(`/messages/${m.author_id}`)}>Message</button>
                </div>
              ))}
            </div>
          )}

          <div className="card pbox">
            <h4>My mentors</h4>
            {outgoing.length === 0 && <p style={{ fontSize: 12.5, color: "var(--slate)" }}>No mentorship requests yet. Pick a mentor from the list.</p>}
            {outgoing.map((m) => (
              <div key={m.id} className="member-row">
                <Avatar name={m.author_name} file={m.author_avatar} size={32} />
                <div className="who">
                  <Link to={`/members/${m.author_id}`}><b>{m.author_name}</b></Link>
                  <span>{m.status === "requested" ? "Request pending" : "Active mentorship"}</span>
                </div>
                {m.status === "active" && <button className="btn-mini ghost" onClick={() => nav(`/messages/${m.author_id}`)}>Message</button>}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
