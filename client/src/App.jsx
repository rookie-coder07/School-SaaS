import { Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import DevProtectedRoute from "./components/DevProtectedRoute";
import DeveloperRoute from "./components/DeveloperRoute";
import { FullPageLoader } from "./components/ui/Loaders";
import AdminLogin from "./pages/AdminLogin";
import StudentLogin from "./pages/StudentLogin";
import TeacherLogin from "./pages/TeacherLogin";
import DevLogin from "./dev/DevLogin";
import DevLayout from "./dev/DevLayout";
import DevDashboardPage from "./dev/pages/DevDashboardPage";
import DevSchoolsPage from "./dev/pages/DevSchoolsPage";
import DevUsersPage from "./dev/pages/DevUsersPage";
import DevVoiceMessagesPage from "./dev/pages/DevVoiceMessagesPage";
import DevDataExplorerPage from "./dev/pages/DevDataExplorerPage";
import DevSystemControlsPage from "./dev/pages/DevSystemControlsPage";
import DevAuditLogsPage from "./dev/pages/DevAuditLogsPage";
import DevSystemPage from "./dev/pages/DevSystemPage";
import DevErrorsPage from "./dev/pages/DevErrorsPage";
import DevLogsPage from "./dev/pages/DevLogsPage";
import DevApiPage from "./dev/pages/DevApiPage";
import DevActivityPage from "./dev/pages/DevActivityPage";
import DevFeaturesPage from "./dev/pages/DevFeaturesPage";
import DevTracesPage from "./dev/pages/DevTracesPage";
import DevToolsPage from "./dev/pages/DevToolsPage";
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
  const location = useLocation();
  const hideNavbar =
    location.pathname.startsWith("/admin/dashboard") ||
    location.pathname.startsWith("/teacher/") && location.pathname !== "/teacher/login" ||
    location.pathname.startsWith("/student/dashboard") ||
    location.pathname.startsWith("/dev-console");

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
      {!hideNavbar ? <Navbar /> : null}

      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/admissions" element={<Admissions />} />
          <Route path="/contact" element={<Contact />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/login" element={<Navigate to="/dev-login" replace />} />
          <Route
            path="/dashboard"
            element={(() => {
              const role = String(localStorage.getItem("userRole") || "").toLowerCase();
              if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
              if (role === "teacher") return <Navigate to="/teacher/dashboard" replace />;
              if (role === "developer") return <Navigate to="/dev-console/dashboard" replace />;
              return <Navigate to="/student/dashboard" replace />;
            })()}
          />
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

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* 🔐 DEVELOPER PORTAL (ISOLATED IMPLEMENTATION) */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <Route path="/dev-login" element={<DevLogin />} />
          
          {/* Developer Console with Nested Routes */}
          <Route
            path="/dev-console"
            element={
              <DevProtectedRoute>
                <DeveloperRoute>
                  <DevLayout />
                </DeveloperRoute>
              </DevProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DevDashboardPage />} />
            <Route path="schools" element={<DevSchoolsPage />} />
            <Route path="users" element={<DevUsersPage />} />
            <Route path="voice-messages" element={<DevVoiceMessagesPage />} />
            <Route path="data-explorer" element={<DevDataExplorerPage />} />
            <Route path="system-controls" element={<DevSystemControlsPage />} />
            <Route path="audit-logs" element={<DevAuditLogsPage />} />

            {/* Legacy aliases kept for backward compatibility */}
            <Route path="system" element={<DevSystemPage />} />
            <Route path="errors" element={<DevErrorsPage />} />
            <Route path="logs" element={<DevLogsPage />} />
            <Route path="api-usage" element={<DevApiPage />} />
            <Route path="live-activity" element={<DevActivityPage />} />
            <Route path="api" element={<DevApiPage />} />
            <Route path="activity" element={<DevActivityPage />} />
            <Route path="features" element={<DevFeaturesPage />} />
            <Route path="traces" element={<DevTracesPage />} />
            <Route path="tools" element={<DevToolsPage />} />
          </Route>

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
                    to={
                      role === "admin" ? "/admin/dashboard" : 
                      role === "teacher" ? "/teacher/dashboard" : 
                      "/student/dashboard"
                    }
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
