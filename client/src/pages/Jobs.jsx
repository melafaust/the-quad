import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, timeAgo } from "../api.js";
import { report } from "./Home.jsx";
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
  const [editing, setEditing] = useState(null);
  const [applyTo, setApplyTo] = useState(null);      // job we're applying for
  const [applyForm, setApplyForm] = useState({ note: "", share_cv: false });
  const [applying, setApplying] = useState(false);
  const [applicants, setApplicants] = useState(null); // { jobId, rows }

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
    if (editing) await api.put(`/jobs/${editing}`, form);
    else await api.post("/jobs", form);
    setForm(empty); setShowForm(false); load();
    setToast(editing ? "Job updated." : "Job posted.");
    setEditing(null);
  };
  // A job could be created and removed but never corrected, so a typo meant delete and
  // re-post, which lost the original posting date.
  const edit = (j) => {
    setForm({
      title: j.title || "", company: j.company || "", location: j.location || "", country: j.country || "",
      job_type: j.job_type || "Full-time", salary_range: j.salary_range || "", job_function: j.job_function || "",
      description: j.description || "", apply_url: j.apply_url || "", apply_email: j.apply_email || "",
    });
    setEditing(j.id); setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // Applications are recorded in The Quad, so the poster is actually notified. The old
  // flow handed off to a mail client and the app never learned anything had happened.
  const submitApply = async (e) => {
    e.preventDefault();
    if (applying) return;
    setApplying(true);
    try {
      await api.post(`/jobs/${applyTo.id}/apply`, applyForm);
      setToast(`Application sent to ${applyTo.author_name} for ${applyTo.title}.`);
      setApplyTo(null); setApplyForm({ note: "", share_cv: false });
      load();
    } catch (ex) { alert(ex.message); }
    finally { setApplying(false); }
  };
  const withdraw = async (j) => {
    if (!confirm(`Withdraw your application for ${j.title}?`)) return;
    await api.del(`/jobs/${j.id}/apply`);
    setToast("Application withdrawn.");
    load();
  };
  const showApplicants = async (j) => {
    if (applicants?.jobId === j.id) return setApplicants(null);
    setApplicants({ jobId: j.id, rows: await api.get(`/jobs/${j.id}/applications`) });
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
          <h4>{editing ? "Edit job post" : "New job post"}</h4>
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
          <button className="btn">{editing ? "Save changes" : "Publish job"}</button>{" "}
          <button type="button" className="btn ghost" onClick={() => { setShowForm(false); setEditing(null); setForm(empty); }}>Cancel</button>
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
                {/* Applying in-app is the default now, so the poster is actually told. The
                    external link and email are kept as secondary routes. */}
                {j.poster_id !== me.id && !j.applied_by_me && (
                  <button className="btn sm" onClick={() => { setApplyTo(j); setApplyForm({ note: "", share_cv: false }); }}>Apply</button>
                )}
                {j.poster_id !== me.id && j.applied_by_me && (
                  <>
                    <span className="badge b-ok">Applied ✓</span>
                    <button className="link-btn" onClick={() => withdraw(j)}>Withdraw</button>
                  </>
                )}
                {(j.poster_id === me.id || me.role === "admin") && (
                  <button className="btn ghost sm" onClick={() => showApplicants(j)}>
                    {Number(j.applicants) === 1 ? "1 applicant" : `${Number(j.applicants) || 0} applicants`}
                  </button>
                )}
                {j.apply_url && <a className="link-btn" href={j.apply_url} target="_blank" rel="noreferrer">Employer site</a>}
                {j.apply_email && (
                  <a className="link-btn" href={`mailto:${j.apply_email}?subject=${encodeURIComponent("Application: " + j.title)}`}
                    target="_blank" rel="noreferrer" onClick={() => applyByEmail(j.apply_email)}>Email instead</a>
                )}
                {j.poster_id !== me.id && <Link className="link-btn" to={`/messages/${j.author_id}`}>Message poster</Link>}
                {(j.poster_id === me.id || me.role === "admin") && (
                  <>
                    <button className="link-btn" onClick={() => edit(j)}>Edit</button>
                    <button className="link-btn red" onClick={() => remove(j.id)}>Remove</button>
                  </>
                )}
                {j.poster_id !== me.id && me.role !== "admin" && (
                  <button className="link-btn" onClick={() => report("job", j.id)}>Report</button>
                )}
              </div>

              {applicants?.jobId === j.id && (
                <div className="attendees">
                  <div className="att-head"><b>{applicants.rows.length} applied for {j.title}</b>
                    <button className="link-btn" onClick={() => setApplicants(null)}>Hide</button>
                  </div>
                  {applicants.rows.length === 0 && <p style={{ fontSize: 12.5, color: "var(--slate)" }}>No applications yet.</p>}
                  {applicants.rows.map((a) => (
                    <div key={a.id} className="applicant">
                      <div className="member-row" style={{ padding: 0 }}>
                        <div className="who">
                          <Link to={`/members/${a.applicant_id}`}><b>{a.name}</b></Link>
                          <span>{[a.job_title, a.company].filter(Boolean).join(" · ") || a.programme} · {a.email}</span>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--slate-lt)" }}>{timeAgo(a.created_at)}</span>
                      </div>
                      {a.note && <p className="applicant-note">"{a.note}"</p>}
                      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                        {a.cv_file && <a className="link-btn" href={`/api/jobs/${j.id}/applications/${a.id}/cv`} target="_blank" rel="noreferrer">Download CV</a>}
                        <Link className="link-btn" to={`/messages/${a.applicant_id}`}>Message</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {jobs.length === 0 && <p style={{ color: "var(--slate)" }}>No jobs match those filters — post the first one.</p>}
        </div>
      )}

      {applyTo && (
        <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && setApplyTo(null)}>
          <form className="modal" style={{ width: 460 }} onSubmit={submitApply}>
            <h4>Apply for {applyTo.title}</h4>
            <p style={{ marginBottom: 12 }}>{applyTo.company} · posted by {applyTo.author_name}</p>
            <div className="field">
              <label>Message to the poster (optional)</label>
              <textarea value={applyForm.note} maxLength={2000}
                onChange={(e) => setApplyForm({ ...applyForm, note: e.target.value })}
                placeholder="Why you're a fit, and anything they should know." />
            </div>
            <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13 }}>
              <input type="checkbox" checked={applyForm.share_cv}
                onChange={(e) => setApplyForm({ ...applyForm, share_cv: e.target.checked })} />
              <span>
                Attach my CV{me.cv_file ? "" : " — you haven't uploaded one yet"}
                <small className="hint-inline">Shares your CV with this poster only, whatever your profile visibility says.</small>
              </span>
            </label>
            <div className="modal-actions">
              <button type="button" className="btn ghost sm" onClick={() => setApplyTo(null)}>Cancel</button>
              <button className="btn sm" disabled={applying}>{applying ? "Sending…" : "Send application"}</button>
            </div>
          </form>
        </div>
      )}

      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );
}
