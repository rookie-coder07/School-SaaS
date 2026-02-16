import { useState, useEffect } from "react";
import { useToast } from "./ToastProvider";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function StudentSyllabus({ token }) {
  const toast = useToast();
  const [syllabuses, setSyllabuses] = useState([]);
  const [examSyllabuses, setExamSyllabuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedExamIds, setExpandedExamIds] = useState({});

  useEffect(() => {
    fetchSyllabuses();
  }, [token]);

  const fetchSyllabuses = async () => {
    setLoading(true);
    try {
      // Fetch traditional syllabuses
      const res = await fetch(`${API_URL}/api/student/syllabus`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSyllabuses(Array.isArray(data) ? data : []);
      }

      // Fetch exam-level syllabuses
      const resExam = await fetch(`${API_URL}/api/student/exam-syllabus`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resExam.ok) {
        const dataExam = await resExam.json();
        setExamSyllabuses(Array.isArray(dataExam) ? dataExam : []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load syllabus");
    } finally {
      setLoading(false);
    }
  };

  // Group traditional syllabuses by exam name
  const groupedByExam = syllabuses.reduce((acc, syl) => {
    const examKey = syl.examName || "General";
    if (!acc[examKey]) acc[examKey] = [];
    acc[examKey].push(syl);
    return acc;
  }, {});

  const toggleExamExpanded = (examId) => {
    setExpandedExamIds((prev) => ({
      ...prev,
      [examId]: !prev[examId],
    }));
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/50 text-center text-slate-500">
        Loading syllabus...
      </div>
    );
  }

  const hasTraditionalSyllabuses = Object.keys(groupedByExam).length > 0;
  const hasExamSyllabuses = examSyllabuses.length > 0;

  if (!hasTraditionalSyllabuses && !hasExamSyllabuses) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/50 text-center text-slate-500">
        No syllabus available yet
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ===== EXAM-LEVEL SYLLABUSES ===== */}
      {hasExamSyllabuses && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-6">📚 Exam Syllabuses</h2>
          <div className="grid grid-cols-1 gap-4">
            {examSyllabuses.map((exam) => (
              <div
                key={exam._id}
                className="bg-white rounded-2xl border border-slate-200/50 shadow-sm hover:shadow-md transition overflow-hidden"
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
                  {exam.updatedAt && new Date(exam.updatedAt) !== new Date(exam.createdAt) && (
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
      )}

      {/* ===== TRADITIONAL SYLLABUSES ===== */}
      {hasTraditionalSyllabuses && (
        <div>
          {hasExamSyllabuses && (
            <h2 className="text-xl font-bold text-slate-900 mb-6">📖 Subject Syllabuses</h2>
          )}
          <div className="space-y-6">
            {Object.entries(groupedByExam).map(([examName, items]) => (
              <div key={examName}>
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-3 pb-2 border-b-2 border-blue-200">
                  📝 {examName}
                </h3>
                <div className="space-y-4">
                  {items.map((syl) => (
                    <div
                      key={syl._id}
                      className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 rounded-2xl border border-slate-200/50 shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-1">
                            {syl.subject}
                          </div>
                          <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-3">
                            {syl.title}
                          </h3>

                          {syl.description && (
                            <p className="text-sm md:text-base text-slate-600 mb-4 line-clamp-3">
                              {syl.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3">
                            {syl.fileUrl && (
                              <a
                                href={`${API_URL}${syl.fileUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold rounded-xl transition text-sm"
                              >
                                📄 View Document
                              </a>
                            )}
                            <span className="text-xs text-slate-500">
                              Added on {new Date(syl.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
