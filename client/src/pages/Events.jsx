import React, { useEffect, useState } from "react";
import { api, eventDate } from "../api.js";
import { useAuth } from "../App.jsx";
import { Spinner, Icon } from "../ui.jsx";

export default function Events() {
  const { me } = useAuth();
  const [events, setEvents] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", event_date: "", location: "", description: "" });

  const load = () => api.get("/events").then(setEvents);
  useEffect(() => { load(); }, []);

  const rsvp = async (id) => { await api.post(`/events/${id}/rsvp`); load(); };
  const create = async (e) => {
    e.preventDefault();
    await api.post("/events", { ...form, event_date: form.event_date.replace("T", " ") });
    setForm({ title: "", event_date: "", location: "", description: "" });
    setShowForm(false); load();
  };
  const remove = async (id) => {
    if (!confirm("Delete this event?")) return;
    await api.del(`/events/${id}`); load();
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-head">
        <h1>Events</h1>
        <span className="sub">Meetups, webinars and alumni gatherings.</span>
        <span className="spacer" />
        {me.role === "admin" && (
          <button className="btn" onClick={() => setShowForm(!showForm)}><Icon name="plus" size={14} /> New event</button>
        )}
      </div>

      {showForm && (
        <form className="card pbox" style={{ marginBottom: 18 }} onSubmit={create}>
          <h4>New event</h4>
          <div className="form-row">
            <div className="field"><label>Title *</label><input value={form.title} onChange={set("title")} required /></div>
            <div className="field"><label>Date & time *</label><input type="datetime-local" value={form.event_date} onChange={set("event_date")} required /></div>
          </div>
          <div className="field"><label>Location</label><input value={form.location} onChange={set("location")} placeholder="Venue, or Online" /></div>
          <div className="field"><label>Description</label><textarea value={form.description} onChange={set("description")} /></div>
          <button className="btn">Publish event</button>
        </form>
      )}

      {events === null ? <Spinner /> : (
        <div className="job-list">
          {events.map((ev) => {
            const d = eventDate(ev.event_date);
            return (
              <div key={ev.id} className="card event-card">
                <div className="date-block"><span className="m">{d.month}</span><span className="d">{d.day}</span></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3>{ev.title}</h3>
                  <div className="where">{d.full}{ev.location ? ` · ${ev.location}` : ""}</div>
                  {ev.description && <div className="desc">{ev.description}</div>}
                  <button className={`btn sm ${ev.my_rsvp ? "ghost" : ""}`} onClick={() => rsvp(ev.id)}>
                    {ev.my_rsvp ? "Going ✓ (tap to cancel)" : "RSVP"}
                  </button>
                  <span className="going">{ev.going} going</span>
                  {me.role === "admin" && <button className="link-btn red" style={{ marginLeft: 14 }} onClick={() => remove(ev.id)}>Delete</button>}
                </div>
              </div>
            );
          })}
          {events.length === 0 && <p style={{ color: "var(--slate)" }}>No upcoming events{me.role === "admin" ? " — create the first one." : " yet."}</p>}
        </div>
      )}
    </div>
  );
}
