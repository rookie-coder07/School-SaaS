import { BrowserRouter, Routes, Route } from "react-router-dom";

/* ===== COMMON ===== */
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

/* ===== PUBLIC ===== */
import Home from "./pages/Home";
import About from "./pages/About";
import Admissions from "./pages/Admissions";
import AdmissionForm from "./pages/AdmissionForm";
import Contact from "./pages/Contact";

/* ===== ADMIN ===== */
import AdminLogin from "./pages/AdminLogin";
import AdminAdmissions from "./pages/AdminAdmissions";
import AdminDashboard from "./pages/AdminDashboard";

/* ===== STUDENT ===== */
import StudentLogin from "./pages/StudentLogin";
import StudentDashboard from "./pages/StudentDashboard";

/* ===== TEACHER ===== */
import TeacherLogin from "./pages/TeacherLogin";
import TeacherDashboard from "./pages/TeacherDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        {/* 🌐 Public */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/admissions" element={<Admissions />} />
        <Route path="/apply" element={<AdmissionForm />} />
        <Route path="/contact" element={<Contact />} />

        {/* 🧑‍💼 Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/admissions"
          element={
            <ProtectedRoute role="admin">
              <AdminAdmissions />
            </ProtectedRoute>
          }
        />

        {/* 👨‍🎓 Student */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute role="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* 🧑‍🏫 Teacher */}
        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute role="teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        {/* ❌ 404 */}
        <Route
          path="*"
          element={
            <div style={{ padding: "2rem" }}>
              <h2>404 – Page Not Found</h2>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
