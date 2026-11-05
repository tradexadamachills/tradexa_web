import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./auth";
import { Landing } from "./pages/Landing";
import { AuthScreen } from "./pages/Auth";
import { PublicInfo, Workspace } from "./pages/Workspace";
import "./styles.css";
import "./landing.css";
import "./workspace.css";
import "./auth.css";
import "./responsive.css";
import "./light.css";
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<AuthScreen />} />
          <Route path="/auth/callback" element={<AuthScreen />} />
          <Route path="/preview/:tab?" element={<Workspace preview />} />
          <Route path="/app/:tab?" element={<Workspace />} />
          <Route path="/privacy" element={<PublicInfo kind="privacy" />} />
          <Route path="/security" element={<PublicInfo kind="security" />} />
          <Route path="*" element={<PublicInfo kind="security" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
