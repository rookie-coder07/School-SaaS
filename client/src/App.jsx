import { BrowserRouter, Routes, Route } from "react-router-dom";

/* ===== COMMON COMPONENTS ===== */
import Navbar from "./components/Navbar";

/* ===== PUBLIC PAGES ===== */
import Home from "./pages/Home";
import About from "./pages/About";
import Admissions from "./pages/Admissions";
import AdmissionForm from "./pages/AdmissionForm";
import Contact from "./pages/Contact";

/* ===== ADMIN PAGES ===== */
import AdminLogin from "./pages/AdminLogin";
import AdminAdmissions from "./pages/AdminAdmissions";

/* ===== STUDENT PAGES ===== */
import StudentLogin from "./pages/StudentLogin";
import StudentDashboard from "./pages/StudentDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        {/* 🌐 Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/admissions" element={<Admissions />} />
        <Route path="/apply" element={<AdmissionForm />} />
        <Route path="/contact" element={<Contact />} />

        {/* 🧑‍💼 Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/admissions" element={<AdminAdmissions />} />

        {/* 👨‍🎓 Student Routes */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />

        {/* ❌ 404 Fallback */}
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
