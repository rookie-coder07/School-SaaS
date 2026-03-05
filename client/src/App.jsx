import { Suspense, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { FullPageLoader } from "./components/ui/Loaders";
import AdminLogin from "./pages/AdminLogin";
import StudentLogin from "./pages/StudentLogin";
import TeacherLogin from "./pages/TeacherLogin";
import { lazyWithRetry } from "./utils/lazyWithRetry";

const Home = lazyWithRetry(() => import("./pages/Home"), "HomePage");
const About = lazyWithRetry(() => import("./pages/About"), "AboutPage");
const Admissions = lazyWithRetry(() => import("./pages/Admissions"), "AdmissionsPage");
const Contact = lazyWithRetry(() => import("./pages/Contact"), "ContactPage");

const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"), "AdminDashboardPage");

const StudentDashboard = lazyWithRetry(() => import("./pages/StudentDashboard"), "StudentDashboardPage");

const TeacherDashboard = lazyWithRetry(() => import("./pages/TeacherDashboard"), "TeacherDashboardPage");
const TeacherChangePassword = lazyWithRetry(() => import("./pages/TeacherChangePassword"), "TeacherChangePasswordPage");
const StudentAnalyticsDashboard = lazyWithRetry(
  () => import("./pages/StudentAnalyticsDashboard"),
  "StudentAnalyticsDashboardPage"
);

const DeveloperLogin = lazyWithRetry(() => import("./pages/DeveloperLogin"), "DeveloperLoginPage");
const DeveloperDashboard = lazyWithRetry(() => import("./pages/DeveloperDashboard"), "DeveloperDashboardPage");
const DevSchoolsList = lazyWithRetry(() => import("./pages/DevSchoolsList"), "DevSchoolsListPage");
const DevSchoolDetails = lazyWithRetry(() => import("./pages/DevSchoolDetails"), "DevSchoolDetailsPage");

const preloadLikelyRoutes = () => {
  import("./pages/AdminDashboard");
  import("./pages/TeacherDashboard");
  import("./pages/StudentDashboard");
  import("./pages/StudentAnalyticsDashboard");
};

const shouldSkipPreload = () => {
  if (typeof navigator === "undefined") return false;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const saveData = Boolean(connection?.saveData);
  const slowNetwork = ["slow-2g", "2g", "3g"].includes(String(connection?.effectiveType || "").toLowerCase());
  const lowMemory = typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4;
  return saveData || slowNetwork || lowMemory;
};

export default function App() {
  useEffect(() => {
    if (shouldSkipPreload()) return undefined;
    const scheduler = window.requestIdleCallback || ((cb) => setTimeout(cb, 1200));
    const handle = scheduler(() => preloadLikelyRoutes());
    return () => {
      if (window.cancelIdleCallback && typeof handle === "number") {
        window.cancelIdleCallback(handle);
      }
    };
  }, []);

  return (
    <>
      <Navbar />

      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/admissions" element={<Admissions />} />
          <Route path="/contact" element={<Contact />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/student/login" element={<StudentLogin />} />
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute role="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/student-analytics"
            element={
              <ProtectedRoute role="student">
                <StudentAnalyticsDashboard />
              </ProtectedRoute>
            }
          />

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
            path="/teacher/change-password"
            element={
              <ProtectedRoute role="teacher">
                <TeacherChangePassword />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/subjects"
            element={
              <ProtectedRoute role="teacher">
                <TeacherDashboard routeTab="subjects" />
              </ProtectedRoute>
            }
          />
          <Route path="/teacher/academics" element={<Navigate to="/teacher/subjects" replace />} />
          <Route
            path="/teacher/exams"
            element={
              <ProtectedRoute role="teacher">
                <TeacherDashboard routeTab="exams" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/marks-entry"
            element={
              <ProtectedRoute role="teacher">
                <TeacherDashboard routeTab="marks-entry" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/view-marks"
            element={
              <ProtectedRoute role="teacher">
                <TeacherDashboard routeTab="view-marks" />
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

          <Route
            path="*"
            element={(() => {
              const hasAuth =
                localStorage.getItem("studentToken") ||
                localStorage.getItem("teacherToken") ||
                localStorage.getItem("adminToken") ||
                localStorage.getItem("developerToken");

              if (hasAuth) {
                const role = localStorage.getItem("userRole") || "student";
                return (
                  <Navigate
                    to={`/${role === "admin" ? "admin" : role === "teacher" ? "teacher" : role === "developer" ? "dev" : "student"}/dashboard`}
                    replace
                  />
                );
              }

              return <Navigate to="/" replace />;
            })()}
          />
        </Routes>
      </Suspense>
    </>
  );
}
