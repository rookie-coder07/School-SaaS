import { useState, useEffect } from "react";
import { useToast } from "./ToastProvider";

export default function ExamTimetableManager({ token, teacher }) {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const toast = useToast();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [subject, setSubject] = useState("");
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch exams on component mount
  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/teacher/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch exams");
      const data = await res.json();
      setExams(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !examName || !examDate || !startTime || !endTime) {
      toast.warning("All fields are required");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/teacher/exams`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          examName,
          examDate,
          startTime,
          endTime,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add exam");
      }

      toast.success("Exam added successfully!");
      setSubject("");
      setExamName("");
      setExamDate("");
      setStartTime("");
      setEndTime("");

      // Refresh list
      fetchExams();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to add exam");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (examId) => {
    if (!window.confirm("Are you sure you want to delete this exam?")) return;

    try {
      const res = await fetch(`${API_URL}/api/teacher/exams/${examId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete exam");
      toast.success("Exam deleted successfully!");
      fetchExams();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete exam");
    }
  };

  const isUpcoming = (dateStr) => {
    return new Date(dateStr) >= new Date();
  };

  return (
    <div className="space-y-6">
      {/* Add Exam Form */}
      <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-5">Add New Exam</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Subject *</label>
              <input
                type="text"
                placeholder="e.g., Mathematics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Exam Name *</label>
              <input
                type="text"
                placeholder="e.g., Mid-term Exam"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Exam Date *</label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Start Time *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">End Time *</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-xl transition"
          >
            {submitting ? "Adding..." : "Add Exam"}
          </button>
        </form>
      </div>

      {/* Exams List */}
      <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-5">Exam Schedule</h3>

        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading exams...</div>
        ) : exams.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No exams scheduled</div>
        ) : (
          <div className="space-y-3">
            {exams.map((exam) => {
              const upcoming = isUpcoming(exam.examDate);
              return (
                <div
                  key={exam._id}
                  className={`p-4 rounded-xl border-2 transition ${
                    upcoming
                      ? "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-md"
                      : "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-slate-600 uppercase tracking-wide">{exam.subject}</div>
                        {upcoming && (
                          <span className="text-xs font-bold px-2 py-1 bg-blue-200 text-blue-700 rounded-lg">
                            Upcoming
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 mt-1">{exam.examName}</h4>
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-600">
                        <span>📅 {new Date(exam.examDate).toLocaleDateString()}</span>
                        <span>⏰ {exam.startTime} - {exam.endTime}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(exam._id)}
                      className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
