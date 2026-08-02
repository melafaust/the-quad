import React, { createContext, useContext, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { api, getToken } from "./api.js";
import { Layout } from "./ui.jsx";
import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import Directory from "./pages/Directory.jsx";
import Member from "./pages/Member.jsx";
import ProfileEdit from "./pages/ProfileEdit.jsx";
import Jobs from "./pages/Jobs.jsx";
import Marketplace from "./pages/Marketplace.jsx";
import Mentoring from "./pages/Mentoring.jsx";
import Events from "./pages/Events.jsx";
import Messages from "./pages/Messages.jsx";
import Admin from "./pages/Admin.jsx";
import TestDashboard from "./pages/TestDashboard.jsx";
import BetaTriage from "./pages/BetaTriage.jsx";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function App() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(!!getToken());
  const location = useLocation();

  const refreshMe = () => api.get("/me").then(setMe).catch(() => setMe(null));

  useEffect(() => {
    if (getToken()) refreshMe().finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="splash">The Quad</div>;

  if (!me && location.pathname !== "/login")
    return <Navigate to="/login" replace />;

  return (
    <AuthCtx.Provider value={{ me, setMe, refreshMe }}>
      <Routes>
        <Route path="/login" element={me ? <Navigate to="/" replace /> : <Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/members/:id" element={<Member />} />
          <Route path="/profile" element={<ProfileEdit />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/mentoring" element={<Mentoring />} />
          <Route path="/events" element={<Events />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:userId" element={<Messages />} />
          <Route path="/admin" element={me?.role === "admin" ? <Admin /> : <Navigate to="/" replace />} />
          <Route path="/test-dashboard" element={me?.role === "admin" ? <TestDashboard /> : <Navigate to="/" replace />} />
          <Route path="/beta-triage" element={me?.role === "admin" ? <BetaTriage /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthCtx.Provider>
  );
}
