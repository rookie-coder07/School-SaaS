import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function StudentExams({ token }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/student/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch exams");
      const data = await res.json();
      setExams(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Failed to load exam timetable");
    } finally {
      setLoading(false);
    }
  };

  const isUpcoming = (dateStr) => {
    return new Date(dateStr) >= new Date();
  };

  const getDaysUntil = (dateStr) => {
    const today = new Date();
    const examDate = new Date(dateStr);
    const diffTime = examDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/50 text-center text-slate-500">
        Loading exam timetable...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/50 text-center text-red-600">
        {error}
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/50 text-center text-slate-500">
        No exams scheduled
      </div>
    );
  }

  const upcomingExams = exams.filter((e) => isUpcoming(e.examDate));
  const pastExams = exams.filter((e) => !isUpcoming(e.examDate));

  return (
    <div className="space-y-6">
      {/* Upcoming Exams */}
      {upcomingExams.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Upcoming Exams</h3>
          {upcomingExams.map((exam) => {
            const daysUntil = getDaysUntil(exam.examDate);
            return (
              <div
                key={exam._id}
                className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 md:p-6 rounded-2xl border-2 border-blue-200 shadow-md hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-1">{exam.subject}</div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-900">{exam.examName}</h3>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-blue-600 uppercase mb-1">Days Left</div>
                    <div className="text-2xl font-black text-blue-600">{daysUntil}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-slate-700 bg-white/50 rounded-xl p-3">
                  <span className="flex items-center gap-2">
                    📅 {new Date(exam.examDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-2">
                    ⏰ {exam.startTime} - {exam.endTime}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Past Exams */}
      {pastExams.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Past Exams</h3>
          {pastExams.map((exam) => (
            <div
              key={exam._id}
              className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 rounded-2xl border border-slate-200/50 shadow-sm hover:shadow-md transition opacity-75"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-1">{exam.subject}</div>
                  <h3 className="text-lg md:text-xl font-bold text-slate-900">{exam.examName}</h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-slate-600">
                <span className="flex items-center gap-2">
                  📅 {new Date(exam.examDate).toLocaleDateString("en-US", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-2">
                  ⏰ {exam.startTime} - {exam.endTime}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
