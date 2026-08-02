import React, { useState } from "react";
import { api, setToken } from "../api.js";
import { useAuth } from "../App.jsx";
import { EMark, IMark, Badge, ErrorNote } from "../ui.jsx";

export default function Login() {
  const { setMe } = useAuth();
  const [tab, setTab] = useState("signin");
  const [form, setForm] = useState({ email: "", password: "", code: "", name: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const data = tab === "signin"
        ? await api.post("/auth/login", { email: form.email, password: form.password })
        : await api.post("/auth/redeem", form);
      setToken(data.token);
      setMe(data.user);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <svg className="ghost-e" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="38" fill="none" stroke="#FFFFFF" strokeWidth="21"
            strokeDasharray="202.2 36.6" transform="rotate(27.5 50 50)" />
          <rect x="34" y="42.5" width="54" height="15" rx="2" fill="#FFFFFF" />
          <circle cx="11" cy="50" r="8" fill="#F26430" />
        </svg>
        <div>
          <div className="login-brands">
            <span className="brandchip"><EMark /><span className="bt"><b>EDUK8U</b><small>Upskilling <i>|</i> Reskilling</small></span></span>
            <span className="brandchip"><IMark /><span className="bt"><b className="icqa-name">ICQA</b><small>RTO No: 46584</small></span></span>
          </div>
          <h1>The Quad<span className="q">.</span> Where our graduates keep moving.</h1>
          <p>A private network for EDUK8U and ICQA alumni across Malaysia, Sri Lanka, Fiji and Australia.
            Jobs, mentoring, a member marketplace, events — and the people who studied alongside you.</p>
        </div>
        <div className="login-badges">
          <Badge brand="EDUK8U" programme="DBA · Masters · Micro-credentials" />
          <Badge brand="ICQA" programme="Australian VET" />
        </div>
      </div>

      <div className="login-right">
        <div className="login-box">
          <div className="card">
            <div className="login-tabs">
              <button className={tab === "signin" ? "on" : ""} onClick={() => { setTab("signin"); setErr(""); }}>Sign in</button>
              <button className={tab === "redeem" ? "on" : ""} onClick={() => { setTab("redeem"); setErr(""); }}>Redeem invite</button>
            </div>

            {tab === "signin" ? (
              <>
                <h2>Welcome back</h2>
                <p className="hint">Sign in with the email you registered with.</p>
              </>
            ) : (
              <>
                <h2>Join The Quad</h2>
                <p className="hint">Your invite code was issued by the alumni office.</p>
              </>
            )}

            <ErrorNote msg={err} />

            <form onSubmit={submit}>
              {tab === "redeem" && (
                <div className="field">
                  <label>Invite code</label>
                  <input value={form.code} onChange={set("code")} placeholder="QUAD-XXXX-XX" autoComplete="off" required />
                </div>
              )}
              <div className="field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={set("email")} required />
              </div>
              <div className="field">
                <label>{tab === "redeem" ? "Choose a password (min 8 characters)" : "Password"}</label>
                <input type="password" value={form.password} onChange={set("password")} minLength={tab === "redeem" ? 8 : undefined} required />
              </div>
              <button className="btn" style={{ width: "100%", justifyContent: "center" }} disabled={busy}>
                {busy ? "One moment…" : tab === "signin" ? "Enter The Quad" : "Create my account"}
              </button>
            </form>
          </div>
          <p className="demo-note">Demo data: sign in as nurul.rahman@demo.thequad / demo123 · admin: winnie.tam@eduk8u.com / ChangeMe123! · try invite code QUAD-DEMO-01</p>
        </div>
      </div>
    </div>
  );
}
