import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import StudentAnalyticsDashboardView from "../components/student/StudentAnalyticsDashboard";
import { useToast } from "../components/ToastProvider";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function StudentAnalyticsDashboard() {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const toast = useToast();

  const teacherToken = localStorage.getItem("teacherToken");
  const studentToken = localStorage.getItem("studentToken");

  const mode = useMemo(() => {
    if (studentId && teacherToken) return "teacher-view";
    return "student-view";
  }, [studentId, teacherToken]);

  useEffect(() => {
    if (mode === "teacher-view" && !teacherToken) toast.error("Teacher authentication token missing.");
    if (mode === "student-view" && !studentToken) toast.error("Student authentication token missing.");
  }, [mode, studentToken, teacherToken, toast]);

  const endpoint =
    mode === "teacher-view"
      ? `${API_URL}/api/teacher/students/${studentId}/analytics`
      : `${API_URL}/api/student/analytics`;
  const token = mode === "teacher-view" ? teacherToken : studentToken;

  return <StudentAnalyticsDashboardView endpoint={endpoint} authToken={token} onBack={() => navigate(-1)} />;
}
