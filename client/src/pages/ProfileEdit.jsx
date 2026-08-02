import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../api.js";
import { useAuth } from "../App.jsx";
import { Avatar, Badge, ErrorNote } from "../ui.jsx";

const FIELDS = [
  ["name", "Full name"], ["job_title", "Job title"], ["company", "Company"],
  ["industry", "Industry"], ["country", "Country"], ["city", "City"],
  ["linkedin_url", "LinkedIn URL"],
];

export default function ProfileEdit() {
  const { me, setMe, refreshMe } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({});
  const [mentor, setMentor] = useState({ role: "", industries: "", expertise: "", capacity: 2, note: "" });
  const [mentorOn, setMentorOn] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const avatarRef = useRef(null);
  const cvRef = useRef(null);

  useEffect(() => {
    setForm(Object.fromEntries([...FIELDS.map(([k]) => [k, me[k] || ""]), ["bio", me.bio || ""], ["cv_visibility", me.cv_visibility]]));
    api.get(`/users/${me.id}`).then((u) => {
      if (u.mentoring) { setMentor(u.mentoring); setMentorOn(true); }
    });
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      const u = await api.put("/me", form);
      setMe({ ...me, ...u });
      setMsg("Profile saved.");
    } catch (ex) { setErr(ex.message); }
  };

  const saveMentoring = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      if (!mentorOn) await api.put("/me/mentoring", { active: false });
      else await api.put("/me/mentoring", mentor);
      setMsg("Mentoring preferences saved.");
    } catch (ex) { setErr(ex.message); }
  };

  const uploadFile = async (kind, e) => {
    const f = e.target.files[0];
    if (!f) return;
    const fd = new FormData();
    fd.append(kind, f);
    try { await api.upload(`/me/${kind}`, fd); refreshMe(); setMsg(kind === "cv" ? "CV uploaded." : "Photo updated."); }
    catch (ex) { setErr(ex.message); }
    e.target.value = "";
  };

  const signOut = () => { setToken(null); window.location.href = "/login"; };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setM = (k) => (e) => setMentor({ ...mentor, [k]: e.target.value });

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-head">
        <h1>My profile</h1>
        <span className="spacer" />
        <button className="btn danger sm" onClick={signOut}>Sign out</button>
      </div>

      <ErrorNote msg={err} />
      {msg && <div className="card" style={{ padding: "10px 16px", marginBottom: 14, fontSize: 13, color: "#15803D" }}>{msg}</div>}

      <div className="card pbox" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="av-wrap">
            <Avatar name={me.name} file={me.avatar_file} size={64} />
            <button className="cam" style={{ width: 24, height: 24 }} title="Upload profile photo" onClick={() => avatarRef.current.click()}>📷</button>
            <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => uploadFile("avatar", e)} />
          </span>
          <div>
            <b style={{ fontSize: 16 }}>{me.name}</b>
            <div style={{ marginTop: 4 }}><Badge brand={me.brand} programme={me.programme} year={me.grad_year} /></div>
            <div style={{ fontSize: 11.5, color: "var(--slate-lt)", marginTop: 6 }}>
              Photo: JPG, PNG or WebP, max 5&nbsp;MB. Your credential badge comes from your graduation record.
            </div>
          </div>
        </div>
      </div>

      <form className="card pbox" style={{ marginBottom: 16 }} onSubmit={save}>
        <h4>Professional details</h4>
        <div className="form-row">
          {FIELDS.map(([k, label]) => (
            <div className="field" key={k}>
              <label>{label}</label>
              <input value={form[k] || ""} onChange={set(k)} placeholder={k === "linkedin_url" ? "https://www.linkedin.com/in/…" : ""} />
            </div>
          ))}
        </div>
        <div className="field">
          <label>About / bio</label>
          <textarea value={form.bio || ""} onChange={set("bio")} placeholder="A few sentences about what you do and what you're interested in." />
        </div>
        <button className="btn">Save profile</button>
      </form>

      <div className="card pbox" style={{ marginBottom: 16 }}>
        <h4>CV</h4>
        <p style={{ marginBottom: 10 }}>
          {me.cv_file ? "A CV is on your profile." : "No CV uploaded yet."} PDF only, max 5 MB.
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn ghost sm" onClick={() => cvRef.current.click()}>{me.cv_file ? "Replace CV" : "Upload CV"}</button>
          <input ref={cvRef} type="file" accept="application/pdf" hidden onChange={(e) => uploadFile("cv", e)} />
          {me.cv_file && <button className="btn danger sm" onClick={async () => { await api.del("/me/cv"); refreshMe(); }}>Remove</button>}
          <span style={{ fontSize: 12, color: "var(--slate)" }}>Visible to:</span>
          <select value={form.cv_visibility || "connections"} onChange={async (e) => {
            setForm({ ...form, cv_visibility: e.target.value });
            await api.put("/me", { cv_visibility: e.target.value });
            refreshMe();
          }} style={{ border: "1px solid #CBD5E1", borderRadius: 8, padding: "6px 10px" }}>
            <option value="everyone">All members</option>
            <option value="connections">My connections only</option>
            <option value="hidden">Only me</option>
          </select>
        </div>
      </div>

      <form className="card pbox" onSubmit={saveMentoring}>
        <h4>Mentoring</h4>
        <label style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 13.5, marginBottom: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={mentorOn} onChange={(e) => setMentorOn(e.target.checked)} />
          I want to take part in the mentoring programme
        </label>
        {mentorOn && (
          <>
            <div className="form-row">
              <div className="field">
                <label>I'm joining as</label>
                <select value={mentor.role} onChange={setM("role")} required>
                  <option value="">Choose…</option>
                  <option value="mentor">Mentor — I'll guide someone</option>
                  <option value="mentee">Mentee — I'm looking for guidance</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="field">
                <label>Mentee capacity (if mentoring)</label>
                <input type="number" min="0" max="10" value={mentor.capacity} onChange={setM("capacity")} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Industries (comma-separated)</label>
                <input value={mentor.industries} onChange={setM("industries")} placeholder="Human Resources, Finance" />
              </div>
              <div className="field">
                <label>Expertise tags</label>
                <input value={mentor.expertise} onChange={setM("expertise")} placeholder="HR leadership, People analytics" />
              </div>
            </div>
            <div className="field">
              <label>Note for potential matches</label>
              <input value={mentor.note} onChange={setM("note")} placeholder="e.g. One conversation a month, senior HR moves." />
            </div>
          </>
        )}
        <button className="btn">Save mentoring preferences</button>
      </form>

      <p style={{ fontSize: 12, color: "var(--slate-lt)", marginTop: 14 }}>
        Want to see your public profile? <a style={{ color: "var(--teal)", fontWeight: 600, cursor: "pointer" }} onClick={() => nav(`/members/${me.id}`)}>View as others see it →</a>
      </p>
    </div>
  );
}
