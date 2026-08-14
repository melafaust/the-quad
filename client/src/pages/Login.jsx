import React, { useState } from "react";
import { api, setToken } from "../api.js";
import { useAuth } from "../App.jsx";
import { EMark, IMark, Badge, ErrorNote } from "../ui.jsx";

export default function Login() {
  const { setMe } = useAuth();
  const [tab, setTab] = useState("signin");
  const [form, setForm] = useState({ email: "", password: "", code: "", name: "", resetToken: "" });
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const go = (t) => { setTab(t); setErr(""); setNote(""); };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setNote("");
    setBusy(true);
    try {
      if (tab === "forgot") {
        await api.post("/auth/forgot", { email: form.email });
        setNote("If that email is registered, the alumni office now has a reset code for you. Contact them to collect it, then enter it below.");
        setTab("reset");
        return;
      }
      const data = tab === "signin"
        ? await api.post("/auth/login", { email: form.email, password: form.password })
        : tab === "reset"
          ? await api.post("/auth/reset", { token: form.resetToken, password: form.password })
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
              <button className={tab === "signin" ? "on" : ""} onClick={() => go("signin")}>Sign in</button>
              <button className={tab === "redeem" ? "on" : ""} onClick={() => go("redeem")}>Redeem invite</button>
            </div>

            {tab === "signin" && (
              <>
                <h2>Welcome back</h2>
                <p className="hint">Sign in with the email you registered with.</p>
              </>
            )}
            {tab === "redeem" && (
              <>
                <h2>Join The Quad</h2>
                <p className="hint">Your invite code was issued by the alumni office.</p>
              </>
            )}
            {tab === "forgot" && (
              <>
                <h2>Reset your password</h2>
                <p className="hint">Enter your registered email and the alumni office will issue you a reset code.</p>
              </>
            )}
            {tab === "reset" && (
              <>
                <h2>Choose a new password</h2>
                <p className="hint">Enter the reset code you were given, then pick a new password.</p>
              </>
            )}

            <ErrorNote msg={err} />
            {note && <div className="login-note">{note}</div>}

            <form onSubmit={submit}>
              {tab === "redeem" && (
                <div className="field">
                  <label>Invite code</label>
                  <input value={form.code} onChange={set("code")} placeholder="QUAD-XXXX-XX" autoComplete="off" required />
                </div>
              )}
              {tab === "reset" && (
                <div className="field">
                  <label>Reset code</label>
                  <input value={form.resetToken} onChange={set("resetToken")} placeholder="RESET-XXXX-XXXX" autoComplete="off" required />
                </div>
              )}
              {tab !== "reset" && (
                <div className="field">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={set("email")} required />
                </div>
              )}
              {tab !== "forgot" && (
                <div className="field">
                  <label>
                    {tab === "signin" ? "Password" : tab === "reset" ? "New password (min 8 characters)" : "Choose a password (min 8 characters)"}
                  </label>
                  <input type="password" value={form.password} onChange={set("password")}
                    minLength={tab === "signin" ? undefined : 8} required />
                </div>
              )}
              <button className="btn" style={{ width: "100%", justifyContent: "center" }} disabled={busy}>
                {busy ? "One moment…"
                  : tab === "signin" ? "Enter The Quad"
                  : tab === "redeem" ? "Create my account"
                  : tab === "forgot" ? "Request a reset code"
                  : "Set new password"}
              </button>
            </form>

            <div className="login-alt">
              {tab === "signin" && <button type="button" onClick={() => go("forgot")}>Forgot your password?</button>}
              {tab === "forgot" && <button type="button" onClick={() => go("reset")}>I already have a reset code</button>}
              {(tab === "forgot" || tab === "reset") && <button type="button" onClick={() => go("signin")}>Back to sign in</button>}
            </div>
          </div>
          <p className="demo-note">Demo data: sign in as nurul.rahman@demo.thequad / demo123 · admin: winnie.tam@eduk8u.com / ChangeMe123! · try invite code QUAD-DEMO-01</p>
        </div>
      </div>
    </div>
  );
}
