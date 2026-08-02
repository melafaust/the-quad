import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, timeAgo, eventDate } from "../api.js";
import { useAuth } from "../App.jsx";
import { Avatar, Badge, Icon, Spinner } from "../ui.jsx";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Post({ p, me, onDelete }) {
  const [likes, setLikes] = useState(p.likes);
  const [liked, setLiked] = useState(!!p.liked_by_me);
  const [comments, setComments] = useState(null); // null = collapsed
  const [nComments, setNComments] = useState(p.comments);
  const [draft, setDraft] = useState("");

  const toggleLike = async () => {
    const r = await api.post(`/posts/${p.id}/like`);
    setLikes(r.likes); setLiked(r.liked_by_me);
  };
  const openComments = async () =>
    setComments(comments === null ? await api.get(`/posts/${p.id}/comments`) : null);
  const sendComment = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    await api.post(`/posts/${p.id}/comments`, { body: draft });
    setDraft("");
    setComments(await api.get(`/posts/${p.id}/comments`));
    setNComments(nComments + 1);
  };

  return (
    <article className="card post">
      <div className="post-head">
        <Link to={`/members/${p.author_id}`}><Avatar name={p.author_name} file={p.author_avatar} size={42} /></Link>
        <div className="post-id">
          <div className="post-name-row">
            <Link to={`/members/${p.author_id}`} className="post-name">{p.author_name}</Link>
            <Badge brand={p.author_brand} programme={p.author_programme} />
          </div>
          <div className="post-meta">
            {[p.author_job_title, p.author_company].filter(Boolean).join(", ")}
            {p.author_city ? ` · ${p.author_city}` : ""} · <span className="post-time">{timeAgo(p.created_at)}</span>
          </div>
        </div>
        {(p.author_id === me.id || me.role === "admin") && (
          <button className="post-del" title="Delete post" onClick={() => onDelete(p.id)}><Icon name="x" size={13} /></button>
        )}
      </div>
      <p className="post-body">{p.body}</p>
      {p.link_url && <p className="post-body"><a href={p.link_url} target="_blank" rel="noreferrer">{p.link_url}</a></p>}
      <div className="engage-line">
        <span>👍 {likes} {likes === 1 ? "like" : "likes"} · {nComments} {nComments === 1 ? "comment" : "comments"}</span>
      </div>
      <div className="post-actions">
        <button className={`pa ${liked ? "active" : ""}`} onClick={toggleLike}><Icon name="like" size={14} /> {liked ? "Liked" : "Like"}</button>
        <button className="pa" onClick={openComments}><Icon name="chat" size={14} /> Comment</button>
      </div>
      {comments !== null && (
        <div className="comments">
          {comments.map((c) => (
            <div key={c.id} className="comment">
              <Avatar name={c.author_name} file={c.author_avatar} size={28} />
              <div className="bubble"><b>{c.author_name}</b>{c.body}</div>
            </div>
          ))}
          <form className="comment-box" onSubmit={sendComment}>
            <input placeholder="Write a comment…" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <button className="btn sm">Send</button>
          </form>
        </div>
      )}
    </article>
  );
}

export default function Home() {
  const { me } = useAuth();
  const nav = useNavigate();
  const [posts, setPosts] = useState(null);
  const [dash, setDash] = useState(null);
  const [draft, setDraft] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showLink, setShowLink] = useState(false);

  const load = () => {
    api.get("/feed").then(setPosts);
    api.get("/home").then(setDash);
  };
  useEffect(load, []);

  const publish = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    await api.post("/posts", { body: draft, link_url: linkUrl });
    setDraft(""); setLinkUrl(""); setShowLink(false);
    api.get("/feed").then(setPosts);
  };
  const deletePost = async (id) => {
    if (!confirm("Delete this post?")) return;
    await api.del(`/posts/${id}`);
    setPosts(posts.filter((p) => p.id !== id));
  };
  const rsvp = async (id) => { await api.post(`/events/${id}/rsvp`); api.get("/home").then(setDash); };
  const connect = async (id) => { await api.post(`/connections/${id}`); api.get("/home").then(setDash); };

  const firstName = me.name.split(" ")[0];

  return (
    <div className="home-grid">
      <div className="feed">
        <section className="card greeting">
          <h1>{greeting()}, {firstName} 👋</h1>
          <p>Here's what's moved in your network.</p>
          {dash && (
            <div className="metrics">
              <Link to="/jobs" className="metric jobs"><i />{dash.newJobs} new {dash.newJobs === 1 ? "job" : "jobs"} this week{me.industry ? ` in ${me.industry}` : ""}</Link>
              {dash.pendingMentees > 0 && <Link to="/mentoring" className="metric alert"><i />{dash.pendingMentees} pending mentee {dash.pendingMentees === 1 ? "request" : "requests"}</Link>}
              {dash.pendingConnections > 0 && <span className="metric alert"><i />{dash.pendingConnections} connection {dash.pendingConnections === 1 ? "request" : "requests"} waiting</span>}
              {dash.nextEvent && <Link to="/events" className="metric"><i />{dash.nextEvent.title} · {eventDate(dash.nextEvent.event_date).full}</Link>}
            </div>
          )}
        </section>

        <section className="card publisher">
          <form onSubmit={publish}>
            <div className="pub-top">
              <Avatar name={me.name} file={me.avatar_file} size={42} />
              <textarea
                placeholder={`What's on your mind, ${firstName}? Share news, a job lead, or ask the marketplace…`}
                value={draft} onChange={(e) => setDraft(e.target.value)}
              />
            </div>
            <div className="pub-actions">
              {showLink ? (
                <span className="pub-link"><input placeholder="https:// paste a link" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} /></span>
              ) : (
                <button type="button" className="pa" style={{ flex: "none", padding: "7px 12px" }} onClick={() => setShowLink(true)}>
                  <Icon name="link" size={14} /> Add link
                </button>
              )}
              <span style={{ flex: 1 }} />
              <button className="btn" disabled={!draft.trim()}>Post</button>
            </div>
          </form>
        </section>

        {dash?.latestRequest && (
          <article className="card post">
            <div className="eyebrow-row"><span className="eyebrow ey-mkt">Marketplace · latest request</span><span className="rule" /></div>
            <div className="post-head">
              <Link to={`/members/${dash.latestRequest.author_id}`}><Avatar name={dash.latestRequest.author_name} file={dash.latestRequest.author_avatar} size={42} /></Link>
              <div className="post-id">
                <div className="post-name-row">
                  <Link to={`/members/${dash.latestRequest.author_id}`} className="post-name">{dash.latestRequest.author_name}</Link>
                  <Badge brand={dash.latestRequest.author_brand} programme={dash.latestRequest.author_programme} />
                </div>
                <div className="post-meta">{[dash.latestRequest.author_job_title, dash.latestRequest.author_company].filter(Boolean).join(", ")} · {timeAgo(dash.latestRequest.created_at)}</div>
              </div>
            </div>
            <div className="inline-offer">
              <p><b>{dash.latestRequest.title}</b>{dash.latestRequest.description ? ` — ${dash.latestRequest.description}` : ""}</p>
              <div className="tags">
                <span className="tag">Request · {dash.latestRequest.category}</span>
                {dash.latestRequest.price_note && <span className="tag">{dash.latestRequest.price_note}</span>}
              </div>
            </div>
            <div className="engage-line">
              <button className="btn ghost sm" onClick={() => nav(`/messages/${dash.latestRequest.author_id}`)}>I can help</button>
              <Link className="link" to="/marketplace">View in Marketplace →</Link>
            </div>
          </article>
        )}

        {dash?.matchedJob && (
          <article className="card post">
            <div className="eyebrow-row"><span className="eyebrow ey-job">Jobs{me.industry ? ` · matched to ${me.industry}` : " · latest"}</span><span className="rule" /></div>
            <div className="job-card" style={{ padding: 0, boxShadow: "none", border: 0 }}>
              <span className="job-logo">{dash.matchedJob.company.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span>
              <div className="job-main">
                <b>{dash.matchedJob.title}</b>
                <div className="co">{dash.matchedJob.company} · {dash.matchedJob.location} · {dash.matchedJob.job_type}</div>
                <div className="tags">
                  {dash.matchedJob.salary_range && <span className="tag">{dash.matchedJob.salary_range}</span>}
                  {me.industry && dash.matchedJob.job_function === me.industry && <span className="tag match">Matches your industry</span>}
                </div>
              </div>
              <div className="job-cta"><Link to="/jobs" className="btn sm">View & apply</Link></div>
            </div>
            <div className="engage-line" style={{ marginTop: 10 }}>
              Posted by <Link to={`/members/${dash.matchedJob.author_id}`} className="link" style={{ marginLeft: 4 }}>{dash.matchedJob.author_name}</Link>
              <Link className="link" to="/jobs">See all roles →</Link>
            </div>
          </article>
        )}

        {posts === null ? <Spinner /> : posts.map((p) => <Post key={p.id} p={p} me={me} onDelete={deletePost} />)}
      </div>

      <aside className="rail-right">
        <div className="card">
          <h4>New members</h4>
          {dash?.newMembers.map((m) => (
            <div key={m.id} className="member-row">
              <Link to={`/members/${m.id}`}><Avatar name={m.name} file={m.avatar_file} size={34} /></Link>
              <div className="who">
                <Link to={`/members/${m.id}`}><b>{m.name}</b></Link>
                <span>{[m.job_title, m.city].filter(Boolean).join(" · ")}</span>
              </div>
              <button className="btn-mini ghost" style={{ color: "var(--teal)", borderColor: "var(--teal)" }} onClick={() => connect(m.id)}>+ Connect</button>
            </div>
          ))}
        </div>

        <div className="card">
          <h4>Upcoming events</h4>
          {dash?.nextEvent ? <EventRows rsvp={rsvp} /> : <p style={{ fontSize: 12.5, color: "var(--slate)" }}>No upcoming events yet.</p>}
        </div>

        <div className="card snip">
          <h4>Mentoring</h4>
          {dash && (
            <p>
              {dash.pendingMentees > 0
                ? <>You have <b>{dash.pendingMentees} pending mentee {dash.pendingMentees === 1 ? "request" : "requests"}</b>.</>
                : <>Give back or level up — mentors and mentees are matched by industry.</>}
            </p>
          )}
          <div style={{ marginTop: 10 }}><Link to="/mentoring" className="btn sm">Open mentoring</Link></div>
        </div>

        {dash?.deal && (
          <div className="card deal-card">
            <h4><span className="fl">Trending in Marketplace</span>{dash.deal.kind === "offer" ? "Member offer" : "Member request"}</h4>
            <p><b>{dash.deal.title}</b>{dash.deal.description ? ` — ${dash.deal.description}` : ""}</p>
            {dash.deal.price_note && <span className="price">{dash.deal.price_note}</span>}
            <div className="row">
              <button className="btn sm on-dark" onClick={() => nav(`/messages/${dash.deal.author_id}`)}>Enquire</button>
              <span className="by">by {dash.deal.author_name}</span>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function EventRows({ rsvp }) {
  const [events, setEvents] = useState([]);
  useEffect(() => { api.get("/events").then((e) => setEvents(e.slice(0, 2))); }, []);
  const toggle = async (id) => { await rsvp(id); api.get("/events").then((e) => setEvents(e.slice(0, 2))); };
  return events.map((ev) => {
    const d = eventDate(ev.event_date);
    return (
      <div key={ev.id} className="event-row">
        <div className="date-block"><span className="m">{d.month}</span><span className="d">{d.day}</span></div>
        <div>
          <b>{ev.title}</b>
          <div className="where">{d.full}{ev.location ? ` · ${ev.location}` : ""}</div>
          <button className={`btn-mini ${ev.my_rsvp ? "ghost" : ""}`} onClick={() => toggle(ev.id)}>
            {ev.my_rsvp ? "Going ✓" : "RSVP"}
          </button>
          <span className="going">{ev.going} going</span>
        </div>
      </div>
    );
  });
}
