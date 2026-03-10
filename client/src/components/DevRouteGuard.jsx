import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const TOKEN_KEY = "developerToken";
const ROLE_KEY = "userRole";

const decodePayload = (token) => {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const payload = parts[1];
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded =
      typeof window !== "undefined" && typeof window.atob === "function"
        ? window.atob(normalized)
        : typeof globalThis !== "undefined" && typeof globalThis.atob === "function"
        ? globalThis.atob(normalized)
        : null;
    if (!decoded) return null;
    return JSON.parse(decoded);
  } catch (_err) {
    return null;
  }
};

const clearDeveloperSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem("devAccess");
};

export default function DevRouteGuard({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    setIsAuthorized(false);

    const token = localStorage.getItem(TOKEN_KEY);
    const role = String(localStorage.getItem(ROLE_KEY) || "").toUpperCase();

    const unauthorize = () => {
      clearDeveloperSession();
      navigate("/dev-login", { replace: true, state: { from: location.pathname } });
    };

    if (!token || role !== "DEVELOPER") {
      unauthorize();
      return () => {
        active = false;
      };
    }

    const payload = decodePayload(token);
    if (!payload || String(payload.role || "").toUpperCase() !== "DEVELOPER") {
      unauthorize();
      return () => {
        active = false;
      };
    }

    if (payload.exp && Date.now() >= Number(payload.exp) * 1000) {
      unauthorize();
      return () => {
        active = false;
      };
    }

    if (active) {
      setIsAuthorized(true);
    }

    return () => {
      active = false;
    };
  }, [location.pathname, navigate]);

  if (!isAuthorized) {
    return null;
  }

  return children;
}
