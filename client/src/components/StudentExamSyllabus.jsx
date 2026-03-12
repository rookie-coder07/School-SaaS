import { useState, useEffect, useCallback } from "react";
import { useToast } from "./ToastProvider";

const API_URL = import.meta.env.VITE_API_URL;

export default function StudentExamSyllabus({ token, selectedExamId }) {
  const toast = useToast();
  const [examSyllabuses, setExamSyllabuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedExamIds, setExpandedExamIds] = useState({});
  const [selectedExamData, setSelectedExamData] = useState(null);

  const fetchExamSyllabuses = useCallback(async () => {
    setLoading(true);
    try {
      console.log("📡 StudentExamSyllabus: Fetching all exam syllabuses...");
      const res = await fetch(`${API_URL}/api/student/exam-syllabus`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const payload = await res.json();
        const data = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
        console.log(`✅ StudentExamSyllabus: Fetched ${Array.isArray(data) ? data.length : 0} exams`);
        data.forEach((exam) => {
          console.log(`   📚 Exam: ${exam.examName} (ID: ${exam._id}, Subjects: ${exam.subjects?.length || 0})`);
        });
        setExamSyllabuses(Array.isArray(data) ? data : []);
      } else {
        console.error("❌ StudentExamSyllabus: Failed to fetch, status:", res.status);
        toast.error("Failed to load exam syllabus");
      }
    } catch (err) {
      console.error("❌ StudentExamSyllabus: Fetch error:", err);
      toast.error("Failed to load exam syllabus");
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  // Fetch all exam syllabuses
  useEffect(() => {
    fetchExamSyllabuses();
  }, [fetchExamSyllabuses]);

  // Auto-expand selected exam when examId changes
  useEffect(() => {
    if (selectedExamId && examSyllabuses.length > 0) {
      console.log("📖 StudentExamSyllabus: Auto-expanding exam ID:", selectedExamId);

      // Find the exam with matching ID
      const selectedExam = examSyllabuses.find((exam) => exam._id === selectedExamId);

      if (selectedExam) {
        console.log("✅ StudentExamSyllabus: Found exam:", selectedExam.examName);
        setSelectedExamData(selectedExam);
        setExpandedExamIds((prev) => ({
          ...prev,
          [selectedExamId]: true, // Auto-expand
        }));
      } else {
        console.warn("⚠️ StudentExamSyllabus: Exam not found for ID:", selectedExamId);
        setSelectedExamData(null);
        toast.warning("Exam syllabus not found");
      }
    }
  }, [selectedExamId, examSyllabuses, toast]);

  const toggleExamExpanded = (examId) => {
    setExpandedExamIds((prev) => ({
      ...prev,
      [examId]: !prev[examId],
    }));
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/50 text-center text-slate-500">
        Loading exam syllabus...
      </div>
    );
  }

  // Selected exam from notification but no data yet
  if (selectedExamId && selectedExamData === null && examSyllabuses.length > 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/50 text-center">
        <p className="text-slate-600 mb-2">❌ Exam syllabus not found</p>
        <p className="text-sm text-slate-500">The exam you're looking for may have been deleted.</p>
      </div>
    );
  }

  if (examSyllabuses.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/50 text-center text-slate-500">
        {selectedExamId ? "Exam syllabus not found" : "No exam syllabus available yet"}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ===== EXAM SYLLABUSES ===== */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-6">📚 Exam Syllabuses</h2>
        <div className="grid grid-cols-1 gap-4">
          {examSyllabuses.map((exam) => (
            <div
              key={exam._id}
              className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition overflow-hidden ${
                selectedExamId === exam._id ? "border-blue-500 border-2" : "border-slate-200/50"
              }`}
            >
              {/* Header - Clickable */}
              <button
                onClick={() => toggleExamExpanded(exam._id)}
                className="w-full px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition text-left"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">{exam.examName}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {exam.subjects?.length || 0} subject{exam.subjects?.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <span
                  className={`text-2xl transition-transform ${
                    expandedExamIds[exam._id] ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </button>

              {/* Expanded Content */}
              {expandedExamIds[exam._id] && (
                <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 space-y-4">
                  {exam.subjects && exam.subjects.length > 0 ? (
                    exam.subjects.map((subject, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-4 rounded-lg border border-slate-200"
                      >
                        <h4 className="font-bold text-slate-900 mb-2">{subject.subjectName}</h4>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                          {subject.syllabusText}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No subjects added yet</p>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                Created on {new Date(exam.createdAt).toLocaleDateString()}
                {exam.updatedAt && new Date(exam.updatedAt).getTime() !== new Date(exam.createdAt).getTime() && (
                  <>
                    {" "}
                    • Updated {new Date(exam.updatedAt).toLocaleDateString()}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

