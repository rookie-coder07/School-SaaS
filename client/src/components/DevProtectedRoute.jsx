import { Navigate } from "react-router-dom";

export default function DevProtectedRoute({ children }) {
  const token = localStorage.getItem("developerToken");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

