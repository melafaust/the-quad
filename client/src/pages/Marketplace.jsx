import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, timeAgo } from "../api.js";
import { useAuth } from "../App.jsx";
import { Avatar, Spinner, Icon, Toast } from "../ui.jsx";

const empty = { kind: "offer", category: "service", title: "", description: "", tags: "", price_note: "", country: "", city: "" };

export default function Marketplace() {
  const { me } = useAuth();
  const nav = useNavigate();
  const [listings, setListings] = useState(null);
  const [tab, setTab] = useState("offer");
  const [f, setF] = useState({ category: "", country: "" });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [filters, setFilters] = useState(null);
  const [toast, setToast] = useState("");
  const [posting, setPosting] = useState(false);

  const load = () => {
    const qs = tab === "closed"
      ? new URLSearchParams({ status: "closed" })
      : new URLSearchParams({ kind: tab, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) });
    api.get(`/listings?${qs}`).then(setListings);
  };
  useEffect(() => { api.get("/filters").then(setFilters); }, []);
  useEffect(load, [tab, f]);

  const post = async (e) => {
    e.preventDefault();
    if (posting) return;
    setPosting(true);
    try {
      await api.post("/listings", form);
      setToast("Listing published.");
      setForm(empty); setShowForm(false); setTab(form.kind); load();
    } finally { setPosting(false); }
  };
  // Closing used to happen silently, and a closed listing then vanished from the only view
  // there was, so it looked like the listing had been deleted.
  const close = async (l) => {
    if (!confirm(`Mark "${l.title}" as closed? It moves to your Closed listings and stops showing to other members.`)) return;
    await api.put(`/listings/${l.id}/close`);
    setToast(`"${l.title}" is closed. Find it under Closed listings.`);
    load();
  };
  const reopen = async (l) => {
    await api.put(`/listings/${l.id}/reopen`);
    setToast(`"${l.title}" is live again.`);
    load();
  };
  const remove = async (id) => {
    if (!confirm("Remove this listing? This can't be undone.")) return;
    await api.del(`/listings/${id}`); load();
  };

  const setL = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="page-head">
        <h1>Alumni Marketplace</h1>
        <span className="sub">Offer your services and products, or ask the community for what you need. Deals happen member to member — The Quad never handles money.</span>
        <span className="spacer" />
        <button className="btn" onClick={() => setShowForm(!showForm)}><Icon name="plus" size={14} /> New listing</button>
      </div>

      {showForm && (
        <form className="card pbox" style={{ marginBottom: 18 }} onSubmit={post}>
          <h4>New listing</h4>
          <div className="form-row">
            <div className="field">
              <label>I'm…</label>
              <select value={form.kind} onChange={setL("kind")}>
                <option value="offer">Offering something</option>
                <option value="request">Looking for something</option>
              </select>
            </div>
            <div className="field">
              <label>It's a…</label>
              <select value={form.category} onChange={setL("category")}>
                <option value="service">Service</option>
                <option value="product">Product</option>
              </select>
            </div>
          </div>
          <div className="field"><label>Title *</label><input value={form.title} onChange={setL("title")} required placeholder={form.kind === "request" ? "Looking for: …" : "e.g. HR policy audit for SMEs"} /></div>
          <div className="field"><label>Description *</label><textarea value={form.description} onChange={setL("description")} required placeholder="What's involved, who it's for, anything a member should know before enquiring." /></div>
          <div className="form-row">
            <div className="field"><label>Price / budget note</label><input value={form.price_note} onChange={setL("price_note")} placeholder="From US$500 · Budget on enquiry" /></div>
            <div className="field"><label>Tags (comma-separated)</label><input value={form.tags} onChange={setL("tags")} placeholder="Consulting, HR" /></div>
            {/* Country drives the marketplace filter, so a listing without one was invisible
                to anyone browsing by country. */}
            <div className="field">
              <label>Country *</label>
              <select value={form.country} onChange={setL("country")} required>
                <option value="">Select a country…</option>
                {filters?.countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label>City</label><input value={form.city} onChange={setL("city")} /></div>
          </div>
          <button className="btn" disabled={posting}>{posting ? "Publishing…" : "Publish listing"}</button>{" "}
          <button type="button" className="btn ghost" onClick={() => setShowForm(false)}>Cancel</button>
        </form>
      )}

      <div className="dir-tabs">
        <button className={`dtab ${tab === "offer" ? "on" : ""}`} onClick={() => setTab("offer")}>Offers</button>
        <button className={`dtab ${tab === "request" ? "on" : ""}`} onClick={() => setTab("request")}>Requests</button>
        <button className={`dtab ${tab === "closed" ? "on" : ""}`} onClick={() => setTab("closed")}>My closed listings</button>
      </div>

      <div className="filters" style={{ display: tab === "closed" ? "none" : undefined }}>
        <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          <option value="">Type: services & products</option>
          <option value="service">Services</option>
          <option value="product">Products</option>
        </select>
        <select value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>
          <option value="">Country: all</option>
          {filters?.countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {listings === null ? <Spinner /> : (
        <div className="listing-grid">
          {listings.map((l) => (
            <div key={l.id} className={`card lcard ${l.kind === "request" ? "request" : ""}`}>
              <div className="lhead">
                <span className={`badge ${l.kind === "offer" ? "b-icqa" : "b-edu"}`}>{l.kind} · {l.category}</span>
                {(l.tags || "").split(",").filter((t) => t.trim()).slice(0, 2).map((t) => <span key={t} className="tag">{t.trim()}</span>)}
              </div>
              <b className="title">{l.title}</b>
              {l.description && <div className="desc">{l.description}</div>}
              {l.price_note && <span className="price">{l.price_note}</span>}
              <div className="owner">
                <Avatar name={l.author_name} file={l.author_avatar} size={24} />
                <span><Link to={`/members/${l.author_id}`}>{l.author_name}</Link>
                  {(l.city || l.country) && ` · ${[l.city, l.country].filter(Boolean).join(", ")}`} · {timeAgo(l.created_at)}</span>
              </div>
              <div className="foot">
                {/* Carry the listing title into the message box so the enquiry doesn't start
                    from a blank screen and the seller knows what it's about. */}
                {l.owner_id !== me.id && (
                  <button className="btn sm" onClick={() => nav(
                    `/messages/${l.author_id}?draft=${encodeURIComponent(
                      l.kind === "offer"
                        ? `Hi ${l.author_name.split(" ")[0]} — I'm interested in "${l.title}". Could you tell me more?`
                        : `Hi ${l.author_name.split(" ")[0]} — I saw you're looking for "${l.title}". I think I can help.`
                    )}`
                  )}>
                    {l.kind === "offer" ? "Enquire" : "I can help"}
                  </button>
                )}
                {l.owner_id === me.id && l.status !== "closed" && (
                  <button className="btn ghost sm" onClick={() => close(l)}>Mark as closed</button>
                )}
                {l.owner_id === me.id && l.status === "closed" && (
                  <button className="btn ghost sm" onClick={() => reopen(l)}>Reopen listing</button>
                )}
                {(l.owner_id === me.id || me.role === "admin") && <button className="link-btn red" onClick={() => remove(l.id)}>Remove</button>}
              </div>
            </div>
          ))}
          {listings.length === 0 && (
            <p style={{ color: "var(--slate)" }}>
              {tab === "closed" ? "You haven't closed any listings yet." : "Nothing here yet — be the first to post."}
            </p>
          )}
        </div>
      )}

      <Toast msg={toast} onDone={() => setToast("")} />
    </div>
  );
}
