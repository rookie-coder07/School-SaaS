import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, role }) {
  let token = null;

  if (role === "admin") token = localStorage.getItem("adminToken");
  if (role === "teacher") token = localStorage.getItem("teacherToken");
  if (role === "student") token = localStorage.getItem("studentToken");

  if (!token) {
    return <Navigate to={`/${role}/login`} replace />;
  }

  return children;
}