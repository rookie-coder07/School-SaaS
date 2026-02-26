import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { FullPageLoader } from "./components/ui/Loaders";
import AdminLogin from "./pages/AdminLogin";
import StudentLogin from "./pages/StudentLogin";
import TeacherLogin from "./pages/TeacherLogin";

const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Admissions = lazy(() => import("./pages/Admissions"));
const Contact = lazy(() => import("./pages/Contact"));

const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));

const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const TeacherChangePassword = lazy(() => import("./pages/TeacherChangePassword"));
const StudentAnalyticsDashboard = lazy(() => import("./pages/StudentAnalyticsDashboard"));

const DeveloperLogin = lazy(() => import("./pages/DeveloperLogin"));
const DeveloperDashboard = lazy(() => import("./pages/DeveloperDashboard"));
const DevSchoolsList = lazy(() => import("./pages/DevSchoolsList"));
const DevSchoolDetails = lazy(() => import("./pages/DevSchoolDetails"));

const preloadLikelyRoutes = () => {
  import("./pages/AdminDashboard");
  import("./pages/TeacherDashboard");
  import("./pages/StudentDashboard");
  import("./pages/StudentAnalyticsDashboard");
};

export default function App() {
  useEffect(() => {
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
