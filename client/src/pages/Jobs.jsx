import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, timeAgo } from "../api.js";
import { useAuth } from "../App.jsx";
import { Spinner, Icon, Toast } from "../ui.jsx";

const empty = { title: "", company: "", location: "", country: "", job_type: "Full-time", salary_range: "", job_function: "", description: "", apply_url: "", apply_email: "" };

export default function Jobs() {
  const { me } = useAuth();
  const [jobs, setJobs] = useState(null);
  const [filters, setFilters] = useState(null);
  const [f, setF] = useState({ country: "", fn: "", q: "" });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [toast, setToast] = useState("");

  // The mailto: link does nothing on machines with no mail client configured, which is
  // how testers hit a dead "Apply by email" button. Copy the address as well so there is
  // always a way to reach the poster, and say which address it was.
  const applyByEmail = (email) => {
    navigator.clipboard?.writeText(email).catch(() => {});
    setToast(`Opening your email app for ${email} — the address is also copied to your clipboard.`);
  };

  const load = () => {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
    api.get(`/jobs?${qs}`).then(setJobs);
  };
  useEffect(() => { api.get("/filters").then(setFilters); }, []);
  useEffect(load, [f]);

  const post = async (e) => {
    e.preventDefault();
    await api.post("/jobs", form);
    setForm(empty); setShowForm(false); load();
  };
  const remove = async (id) => {
    if (!confirm("Remove this job post? This can't be undone.")) return;
    await api.del(`/jobs/${id}`); load();
  };

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setJ = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="page-head">
        <h1>Jobs</h1>
        <span className="sub">Posted by members, for members. Every post shows who shared it.</span>
        <span className="spacer" />
        <button className="btn" onClick={() => setShowForm(!showForm)}><Icon name="plus" size={14} /> Post a job</button>
      </div>

      {showForm && (
        <form className="card pbox" style={{ marginBottom: 18 }} onSubmit={post}>
          <h4>New job post</h4>
          <div className="form-row">
            <div className="field"><label>Job title *</label><input value={form.title} onChange={setJ("title")} required /></div>
            <div className="field"><label>Company *</label><input value={form.company} onChange={setJ("company")} required /></div>
            <div className="field"><label>Location</label><input value={form.location} onChange={setJ("location")} placeholder="City, or Remote" /></div>
            <div className="field"><label>Country</label><input value={form.country} onChange={setJ("country")} /></div>
            <div className="field">
              <label>Type</label>
              <select value={form.job_type} onChange={setJ("job_type")}>
                {["Full-time", "Part-time", "Contract", "Internship"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field"><label>Salary range (optional)</label><input value={form.salary_range} onChange={setJ("salary_range")} placeholder="e.g. RM 8-10k" /></div>
            <div className="field"><label>Function / industry</label><input value={form.job_function} onChange={setJ("job_function")} placeholder="e.g. Human Resources" /></div>
            <div className="field"><label>Apply email</label><input value={form.apply_email} onChange={setJ("apply_email")} type="email" placeholder="who receives applications?" /></div>
          </div>
          <div className="field"><label>Apply link (if you have one)</label><input value={form.apply_url} onChange={setJ("apply_url")} placeholder="https://" /></div>
          <div className="field"><label>Description</label><textarea value={form.description} onChange={setJ("description")} /></div>
          <button className="btn">Publish job</button>{" "}
          <button type="button" className="btn ghost" onClick={() => setShowForm(false)}>Cancel</button>
        </form>
      )}

      <div className="filters">
        <input placeholder="Search title or company…" value={f.q} onChange={set("q")} style={{ width: 220 }} />
        <select value={f.country} onChange={set("country")}>
          <option value="">Country: all</option>
          {filters?.countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={f.fn} onChange={set("fn")}>
          <option value="">Function: all</option>
          {filters?.industries.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>

      {jobs === null ? <Spinner /> : (
        <div className="job-list">
          {jobs.map((j) => (
            <div key={j.id} className="card job-card">
              <span className="job-logo">{j.company.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span>
              <div className="job-main">
                <b>{j.title}</b>
                <div className="co">{j.company}{j.location ? ` · ${j.location}` : ""}{j.country ? `, ${j.country}` : ""} · {j.job_type}</div>
                {j.description && <div className="desc">{j.description}</div>}
                <div className="tags">
                  {j.salary_range && <span className="tag">{j.salary_range}</span>}
                  {j.job_function && <span className="tag">{j.job_function}</span>}
                  {me.industry && j.job_function === me.industry && <span className="tag match">Matches your industry</span>}
                </div>
                <div className="by">Posted by <Link to={`/members/${j.author_id}`}>{j.author_name}</Link> · {timeAgo(j.created_at)}</div>
              </div>
              <div className="job-cta">
                {j.apply_url && <a className="btn sm" href={j.apply_url} target="_blank" rel="noreferrer">Apply</a>}
                {!j.apply_url && j.apply_email && (
                  <a className="btn sm" href={`mailto:${j.apply_email}?subject=${encodeURIComponent("Application: " + j.title)}`}
                    target="_blank" rel="noreferrer" onClick={() => applyByEmail(j.apply_email)}>Apply by email</a>
                )}
                {!j.apply_url && !j.apply_email && <Link className="btn ghost sm" to={`/messages/${j.author_id}`}>Message poster</Link>}
                {(j.poster_id === me.id || me.role === "admin") && (
                  <button className="link-btn red" onClick={() => remove(j.id)}>Remove</button>
                )}
              </div>
            </div>
          ))}
          {jobs.length === 0 && <p style={{ color: "var(--slate)" }}>No jobs match those filters — post the first one.</p>}
        </div>
      )}

      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );
}
