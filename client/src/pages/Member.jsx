import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, getToken, parseDate, isLinkedIn } from "../api.js";
import { useAuth } from "../App.jsx";
import { Avatar, Badge, Spinner, ErrorNote } from "../ui.jsx";

export default function Member() {
  const { id } = useParams();
  const { me } = useAuth();
  const nav = useNavigate();
  const [u, setU] = useState(null);
  const [err, setErr] = useState("");
  const [goal, setGoal] = useState("");
  const [asking, setAsking] = useState(false);

  const load = () => api.get(`/users/${id}`).then(setU).catch((e) => setErr(e.message));
  useEffect(() => { setU(null); setErr(""); load(); }, [id]);

  if (err) return <ErrorNote msg={err} />;
  if (!u) return <Spinner />;
  const isMe = u.id === me.id;

  const connect = async () => { await api.post(`/connections/${u.id}`); load(); };
  const respond = async (accept) => { await api.put(`/connections/${u.connection.id}`, { accept }); load(); };
  const requestMentor = async (e) => {
    e.preventDefault();
    try { await api.post("/mentorships", { mentor_id: u.id, goal_note: goal }); setAsking(false); alert("Request sent."); }
    catch (ex) { alert(ex.message); }
  };
  const downloadCv = async () => {
    const res = await fetch(`/api/users/${u.id}/cv`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!res.ok) return alert((await res.json()).error || "Can't download this CV");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${u.name.replace(/[^\w ]/g, "")}_CV.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const canMentor = u.mentoring && ["mentor", "both"].includes(u.mentoring.role) && !isMe;

  return (
    <div>
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="profile-cover" />
        <div className="profile-body">
          <div className="profile-top">
            <Avatar name={u.name} file={u.avatar_file} size={76} />
            <div className="profile-name">
              <h1>{u.name}</h1>
              <div className="sub">{[u.job_title, u.company].filter(Boolean).join(" · ")}{u.city ? ` · ${u.city}, ${u.country}` : u.country ? ` · ${u.country}` : ""}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <Badge brand={u.brand} programme={u.programme} year={u.grad_year} />
                {u.mentoring && u.mentoring.role !== "mentee" && <span className="badge b-ok">Open to mentor</span>}
                {u.mentoring && u.mentoring.role !== "mentor" && <span className="badge b-icqa">Looking for a mentor</span>}
              </div>
            </div>
            <div className="profile-actions">
              {isMe ? (
                <Link to="/profile" className="btn ghost sm">Edit my profile</Link>
              ) : (
                <>
                  <button className="btn sm" onClick={() => nav(`/messages/${u.id}`)}>Message</button>
                  {!u.connection && <button className="btn ghost sm" onClick={connect}>Connect</button>}
                  {u.connection?.status === "pending" && u.connection.requested_by_me && <button className="btn ghost sm" disabled>Request sent</button>}
                  {u.connection?.status === "pending" && !u.connection.requested_by_me && (
                    <>
                      <button className="btn sm" onClick={() => respond(true)}>Accept request</button>
                      <button className="btn ghost sm" onClick={() => respond(false)}>Decline</button>
                    </>
                  )}
                  {u.connection?.status === "accepted" && <span className="badge b-ok" style={{ alignSelf: "center" }}>Connected</span>}
                  {isLinkedIn(u.linkedin_url) && <a className="li-btn" style={{ width: 34, height: 34 }} href={u.linkedin_url} target="_blank" rel="noreferrer" title={`${u.name} on LinkedIn`}>in</a>}
                </>
              )}
            </div>
          </div>

          <div className="profile-grid">
            <div>
              <div className="card pbox" style={{ marginBottom: 14 }}>
                <h4>About</h4>
                <p>{u.bio || "This member hasn't written a bio yet."}</p>
              </div>
              {canMentor && (
                <div className="card pbox">
                  <h4>Mentoring</h4>
                  <p>
                    {u.mentoring.industries && <>Industries: <b style={{ color: "var(--ink)" }}>{u.mentoring.industries}</b>. </>}
                    {u.mentoring.expertise && <>Expertise: {u.mentoring.expertise}. </>}
                    {u.mentoring.note}
                  </p>
                  {!asking ? (
                    <button className="btn sm" style={{ marginTop: 10 }} onClick={() => setAsking(true)}>Request mentorship</button>
                  ) : (
                    <form onSubmit={requestMentor} style={{ marginTop: 10 }}>
                      <div className="field">
                        <label>What do you want to get out of it?</label>
                        <textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="One or two sentences on your goal…" />
                      </div>
                      <button className="btn sm">Send request</button>{" "}
                      <button type="button" className="btn ghost sm" onClick={() => setAsking(false)}>Cancel</button>
                    </form>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="card pbox" style={{ marginBottom: 14 }}>
                <h4>Details</h4>
                <div className="kv"><span className="k">Credential</span><span className="v">{u.programme}{u.grad_year ? ` · ${u.grad_year}` : ""}</span></div>
                <div className="kv"><span className="k">Institution</span><span className="v">{u.brand}</span></div>
                {u.industry && <div className="kv"><span className="k">Industry</span><span className="v">{u.industry}</span></div>}
                {u.country && <div className="kv"><span className="k">Location</span><span className="v">{[u.city, u.country].filter(Boolean).join(", ")}</span></div>}
                <div className="kv"><span className="k">Member since</span><span className="v">{parseDate(u.created_at)?.toLocaleDateString("en-GB", { month: "short", year: "numeric" }) || "—"}</span></div>
              </div>
              <div className="card pbox">
                <h4>CV</h4>
                {u.cv_file ? (
                  <button className="btn ghost sm" onClick={downloadCv}>Download CV (PDF)</button>
                ) : u.has_cv ? (
                  <p>Shared with connections only — connect with {u.name.split(" ")[0]} to view.</p>
                ) : (
                  <p>No CV uploaded{isMe ? " — add one from Edit my profile" : ""}.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
