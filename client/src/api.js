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

export function timeAgo(iso) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso.replace(" ", "T") + "Z").getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function eventDate(iso) {
  const d = new Date(iso.replace(" ", "T"));
  return {
    month: d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
    day: d.getDate(),
    full: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) +
      (iso.includes(":") ? " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""),
  };
}
