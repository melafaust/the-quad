// Tiny fetch wrapper. Token lives in localStorage; 401 sends you back to /login.
const TOKEN_KEY = "quad_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

async function req(method, url, body, isForm = false) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers["Content-Type"] = "application/json";
  const res = await fetch(`/api${url}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  if (res.status === 401 && !url.startsWith("/auth")) {
    setToken(null);
    window.location.href = "/login";
    throw new Error("Signed out");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (url) => req("GET", url),
  post: (url, body) => req("POST", url, body),
  put: (url, body) => req("PUT", url, body),
  del: (url) => req("DELETE", url),
  upload: (url, formData) => req("POST", url, formData, true),
};

// Only show the "in" icon for links that actually point at a LinkedIn profile. Older
// profiles hold handles and company pages that rendered a working icon leading to a 404.
export const isLinkedIn = (u) =>
  /^https?:\/\/([a-z]{2,3}\.)?(www\.)?linkedin\.com\/in\/[^/?#]+/i.test(String(u || ""));

// Timestamps arrive from Postgres as full ISO strings ("2026-07-16T07:28:03.005Z").
// Older SQLite-era rows use "2026-07-16 07:28:03" with no zone, which JS would read as
// local time, so those get a T and a Z. Anything already carrying a zone is left alone —
// appending a second Z is what produced "Invalid Date" across the app.
export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value) ? null : value;
  const s = String(value).trim();
  const iso = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(s) ? s : s.replace(" ", "T") + "Z";
  const d = new Date(iso);
  return isNaN(d) ? null : d;
}

export function timeAgo(value) {
  const d = parseDate(value);
  if (!d) return "";
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 0) return "just now";
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Absolute date, for places where "3d" isn't specific enough.
export function fullDate(value) {
  const d = parseDate(value);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function dateTime(value) {
  const d = parseDate(value);
  if (!d) return "";
  return d.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function eventDate(value) {
  const d = parseDate(value);
  if (!d) return { month: "", day: "", full: "Date to be confirmed" };
  return {
    month: d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
    day: d.getDate(),
    full: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) +
      " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  };
}
