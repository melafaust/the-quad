import { useEffect, useState } from "react";
import { api } from "../api.js";

function StatusBadge({ status }) {
  const styles = {
    passed: { background: "#d1fae5", color: "#065f46", borderRadius: 999, padding: "2px 10px", fontWeight: 600, fontSize: 13 },
    failed: { background: "#fee2e2", color: "#991b1b", borderRadius: 999, padding: "2px 10px", fontWeight: 600, fontSize: 13 },
  };
  return <span style={styles[status] || {}}>{status === "passed" ? "✓ Pass" : "✗ Fail"}</span>;
}

function RunCard({ run }) {
  const [open, setOpen] = useState(false);
  const pct = run.total > 0 ? Math.round((run.passed / run.total) * 100) : 0;
  const allPassed = run.failed === 0;
  const date = new Date(run.run_at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", cursor: "pointer", background: allPassed ? "#f0fdf4" : "#fff7f7" }}
      >
        <span style={{ fontSize: 24 }}>{allPassed ? "🟢" : "🔴"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{date}</div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>via {run.trigger === "schedule" ? "⏰ daily schedule" : run.trigger === "push" ? "📦 code push" : "▶ manual run"}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: allPassed ? "#065f46" : "#991b1b" }}>{pct}%</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>{run.passed}/{run.total} passed</div>
        </div>
        <span style={{ color: "#9ca3af", fontSize: 18 }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ padding: "0 20px 16px" }}>
          {run.failed > 0 && (
            <div style={{ background: "#fee2e2", borderRadius: 8, padding: "10px 14px", margin: "12px 0 8px", color: "#991b1b", fontWeight: 600 }}>
              ⚠ {run.failed} test{run.failed > 1 ? "s" : ""} failed — these features need attention
            </div>
          )}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                <th style={{ textAlign: "left", padding: "8px 0", color: "#374151" }}>Test</th>
                <th style={{ textAlign: "right", padding: "8px 0", color: "#374151", width: 100 }}>Result</th>
              </tr>
            </thead>
            <tbody>
              {run.tests.map((t, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 0", color: t.status === "failed" ? "#991b1b" : "#111827" }}>{t.name}</td>
                  <td style={{ textAlign: "right", padding: "8px 0" }}>
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function TestDashboard() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchRuns = () => {
    api.get("/admin/test-runs")
      .then((data) => { setRuns(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchRuns(); }, []);

  const triggerRun = async () => {
    setTriggering(true);
    setMessage(null);
    try {
      const res = await api.post("/admin/test-runs/trigger", {});
      setMessage({ type: "success", text: res.message || "Tests started! Results will appear here in about 3 minutes." });
    } catch (e) {
      setMessage({ type: "error", text: "Could not start tests. Please try again." });
    }
    setTriggering(false);
  };

  const latest = runs[0];
  const allPassed = latest && latest.failed === 0;

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>App Health Dashboard</h1>
          <p style={{ margin: "4px 0 0", color: "#6b7280" }}>Run automated checks and see what's working</p>
        </div>
        <button
          onClick={triggerRun}
          disabled={triggering}
          style={{
            background: triggering ? "#9ca3af" : "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "12px 24px",
            fontWeight: 700,
            fontSize: 15,
            cursor: triggering ? "not-allowed" : "pointer",
          }}
        >
          {triggering ? "Starting…" : "▶ Run Tests Now"}
        </button>
      </div>

      {message && (
        <div style={{
          background: message.type === "success" ? "#d1fae5" : "#fee2e2",
          color: message.type === "success" ? "#065f46" : "#991b1b",
          borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontWeight: 500
        }}>
          {message.text}
          {message.type === "success" && (
            <button onClick={() => { setMessage(null); setTimeout(fetchRuns, 180000); }}
              style={{ marginLeft: 12, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", color: "inherit" }}>
              Refresh in 3 min
            </button>
          )}
        </div>
      )}

      {latest && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Last run", value: new Date(latest.run_at).toLocaleDateString("en-AU", { dateStyle: "medium" }) },
            { label: "Tests passing", value: `${latest.passed} / ${latest.total}`, ok: allPassed },
            { label: "Overall status", value: allPassed ? "All Good ✓" : `${latest.failed} issue${latest.failed > 1 ? "s" : ""}`, ok: allPassed },
          ].map((s) => (
            <div key={s.label} style={{ background: "#f9fafb", borderRadius: 12, padding: "16px 20px", border: "1px solid #e5e7eb" }}>
              <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontWeight: 800, fontSize: 20, color: s.ok === false ? "#dc2626" : s.ok === true ? "#059669" : "#111827" }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#9ca3af", textAlign: "center" }}>Loading test history…</p>
      ) : runs.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#6b7280" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🧪</div>
          <p>No test runs yet. Click <strong>Run Tests Now</strong> to start.</p>
        </div>
      ) : (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px", color: "#374151" }}>Test History</h2>
          {runs.map((run) => <RunCard key={run.id} run={run} />)}
        </>
      )}

      <p style={{ color: "#9ca3af", fontSize: 12, marginTop: 24 }}>
        Tests run automatically every night at 1am and on every code update. Results are stored for 20 runs.
      </p>
    </div>
  );
}
