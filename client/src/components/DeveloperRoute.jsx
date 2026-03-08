import { Navigate } from "react-router-dom";

export default function DeveloperRoute({ children }) {
  const role = String(localStorage.getItem("userRole") || "").toUpperCase();
  if (role !== "DEVELOPER") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
