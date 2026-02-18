import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import About from "./pages/About";
import Admissions from "./pages/Admissions";
import Contact from "./pages/Contact";

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

import StudentLogin from "./pages/StudentLogin";
import StudentDashboard from "./pages/StudentDashboard";

import TeacherLogin from "./pages/TeacherLogin";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentAnalyticsDashboard from "./pages/StudentAnalyticsDashboard";

import DeveloperLogin from "./pages/DeveloperLogin";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import DevSchoolsList from "./pages/DevSchoolsList";
import DevSchoolDetails from "./pages/DevSchoolDetails";

export default function App() {
  console.log("✅ App component mounted - Routes configured");
  console.log("✅ Available routes: / /admin/login /admin/dashboard /student/login /student/dashboard /teacher/login /teacher/dashboard /teacher/student-analytics/:studentId /dev/login /dev /dev/schools /dev/schools/:schoolId");
  
  return (
    <>
      <Navbar />

      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/admissions" element={<Admissions />} />
        <Route path="/contact" element={<Contact />} />

        {/* ADMIN */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* STUDENT */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute role="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* TEACHER */}
        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute role="teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/student-analytics/:studentId"
          element={
            <ProtectedRoute role="teacher">
              <StudentAnalyticsDashboard />
            </ProtectedRoute>
          }
        />

        {/* DEVELOPER */}
        <Route path="/dev/login" element={<DeveloperLogin />} />
        <Route
          path="/dev"
          element={
            <ProtectedRoute role="developer">
              <DeveloperDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dev/schools"
          element={
            <ProtectedRoute role="developer">
              <DevSchoolsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dev/schools/:schoolId"
          element={
            <ProtectedRoute role="developer">
              <DevSchoolDetails />
            </ProtectedRoute>
          }
        />

        {/* Fallback route for 404 - keep on current dashboard if authenticated, otherwise go to home */}
        <Route path="*" element={
          (() => {
            // Check if user has any authentication token
            const hasAuth = localStorage.getItem("studentToken") || 
                           localStorage.getItem("teacherToken") || 
                           localStorage.getItem("adminToken") || 
                           localStorage.getItem("developerToken");
            
            if (hasAuth) {
              // User is authenticated, show a 404-like page or return to their dashboard
              // For now, we'll redirect based on role
              const role = localStorage.getItem("userRole") || "student";
              console.warn("🔴 Invalid route for authenticated user. Redirecting to dashboard.");
              return <Navigate to={`/${role === "admin" ? "admin" : role === "teacher" ? "teacher" : role === "developer" ? "dev" : "student"}/dashboard`} replace />;
            }
            
            // Not authenticated, redirect to home
            return <Navigate to="/" replace />;
          })()
        } />
      </Routes>
    </>
  );
}