import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api, timeAgo } from "../api.js";
import { useAuth } from "../App.jsx";
import { Avatar, Badge, Spinner } from "../ui.jsx";

const MESSAGE_MAX = 2000; // matches the server, which truncates at 2000

export default function Messages() {
  const { userId } = useParams();
  const { me } = useAuth();
  const nav = useNavigate();
  const [convs, setConvs] = useState(null);
  const [thread, setThread] = useState(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [params, setParams] = useSearchParams();
  const [people, setPeople] = useState(null);
  const bottomRef = useRef(null);

  const loadConvs = () => api.get("/messages").then(setConvs);
  useEffect(() => { api.get("/members").then((d) => setPeople(d.members)).catch(() => setPeople([])); }, []);
  const loadThread = () => userId && api.get(`/messages/${userId}`).then(setThread);

  useEffect(() => { loadConvs(); }, [userId]);
  useEffect(() => { setThread(null); loadThread(); }, [userId]);
  // Marketplace enquiries arrive with an opener already written.
  useEffect(() => {
    const d = params.get("draft");
    if (d) { setDraft(d.slice(0, MESSAGE_MAX)); setParams({}, { replace: true }); }
  }, [params, setParams]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); }, [thread]);

  // Light polling so replies appear without a manual refresh.
  useEffect(() => {
    const t = setInterval(() => { loadThread(); loadConvs(); }, 12000);
    return () => clearInterval(t);
  }, [userId]);

  const send = async (e) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/messages/${userId}`, { body: draft });
      setDraft("");
      loadThread(); loadConvs();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="msg-grid">
      <div className="card conv-list">
        {/* You used to be able to reach a thread only from someone's profile, so if the
            other person hadn't written first there was no visible way to start. */}
        <div className="conv-new">
          <select value="" onChange={(e) => e.target.value && nav(`/messages/${e.target.value}`)}>
            <option value="">＋ New message to…</option>
            {(people || []).filter((p) => p.id !== me.id).map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.company ? ` · ${p.company}` : ""}</option>
            ))}
          </select>
        </div>
        {convs === null ? <Spinner /> : convs.length === 0 ? (
          <p style={{ padding: 18, fontSize: 13, color: "var(--slate)" }}>
            No conversations yet. Pick someone from "New message" above, or open any member's profile and hit Message.
          </p>
        ) : convs.map((c) => (
          <div key={c.partner_id} className={`conv ${String(c.partner_id) === userId ? "on" : ""}`}
            onClick={() => nav(`/messages/${c.partner_id}`)}>
            <Avatar name={c.name} file={c.avatar_file} size={38} />
            <div className="cmain">
              <b>{c.name}</b>
              <span>{c.last_body}</span>
            </div>
            {c.unread > 0 && <span className="notif">{c.unread}</span>}
          </div>
        ))}
      </div>

      <div className="card thread">
        {!userId ? (
          <div className="msg-empty">Pick a conversation, or message someone from their profile.</div>
        ) : thread === null ? <Spinner /> : (
          <>
            <div className="thread-head">
              <Avatar name={thread.partner.name} file={thread.partner.avatar_file} size={36} />
              <div style={{ flex: 1 }}>
                <b>{thread.partner.name}</b>
                <div><span>{[thread.partner.job_title, thread.partner.company].filter(Boolean).join(" · ")}</span></div>
              </div>
              <Badge brand={thread.partner.brand} programme={thread.partner.programme} />
            </div>
            <div className="thread-body">
              {thread.thread.length === 0 && (
                <div className="msg-empty" style={{ height: "auto", padding: 30 }}>
                  Say hello — this starts your conversation with {thread.partner.name.split(" ")[0]}.
                </div>
              )}
              {thread.thread.map((m) => (
                <div key={m.id} className={`msg ${m.sender_id === me.id ? "mine" : "theirs"}`}>
                  {m.body}
                  <span className="t">{timeAgo(m.created_at)}</span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form className="thread-compose" onSubmit={send}>
              <input placeholder={`Message ${thread.partner.name.split(" ")[0]}…`} value={draft}
                maxLength={MESSAGE_MAX} onChange={(e) => setDraft(e.target.value)} />
              {draft.length > 0 && <span className="counter">{draft.length}/{MESSAGE_MAX}</span>}
              <button className="btn" disabled={!draft.trim() || sending}>{sending ? "Sending…" : "Send"}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
