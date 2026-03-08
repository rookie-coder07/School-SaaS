import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, role }) {
  let token = null;

  if (role === "admin") token = localStorage.getItem("adminToken");
  if (role === "teacher") token = localStorage.getItem("teacherToken");
  if (role === "student") token = localStorage.getItem("studentToken");
  if (role === "developer") token = localStorage.getItem("developerToken");

  if (!token) {
    // Redirect to appropriate login page based on role
    if (role === "developer") {
      return <Navigate to="/system-core/dev-access" replace />;
    }
    return <Navigate to={`/${role}/login`} replace />;
  }

  return children;
}