import { useCallback, useEffect, useRef, useState } from "react";
import DateFilterBar from "./DateFilterBar";
import { buildDateFilterQuery, hasDateFilter } from "../utils/dateFilterUtils";
import EmptyState from "./ui/EmptyState";
import { ListSkeleton } from "./ui/Skeleton";
import { notifySpecificUser } from "../utils/notificationHelper";

const API_URL = import.meta.env.VITE_API_URL;

const REMINDER_DAYS_BEFORE = 1;

const normalizeDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const isReminderWindow = (value) => {
  const target = normalizeDate(value);
  if (!target) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / 86400000);
  return diffDays === REMINDER_DAYS_BEFORE;
};

export default function StudentExams({ token, studentId }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" });
  const reminderAttemptedRef = useRef(new Set());

  const fetchExams = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = buildDateFilterQuery(dateFilter);
      const res = await fetch(`${API_URL}/api/student/exams${query ? `?${query}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch exam timetable");
      const examList = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setExams(examList);
    } catch (err) {
      console.error("STUDENT EXAMS FETCH ERROR:", err);
      setError(err.message || "Failed to load exam timetable");
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, token]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    if (!studentId || !Array.isArray(exams)) return;
    exams.forEach((exam) => {
      const dateValue = exam?.date || exam?.examDate;
      if (!dateValue || !isReminderWindow(dateValue)) return;
      const key = `studentReminder:exam:${studentId}:${exam._id}:${dateValue}`;
      if (reminderAttemptedRef.current.has(key) || localStorage.getItem(key)) return;
      reminderAttemptedRef.current.add(key);
      notifySpecificUser(
        studentId,
        "📝 Exam tomorrow",
        `${exam.examName || "Exam"} (${exam.subject || "Subject"}) is tomorrow.`,
        "exam",
        token,
        { type: "exam", date: dateValue }
      )
        .then(() => {
          localStorage.setItem(key, "1");
        })
        .catch((err) => {
          console.warn("REMINDER notification failed (non-critical):", err);
        });
    });
  }, [exams, studentId, token]);

  if (loading) {
    return (
      <div className="space-y-3">
        <DateFilterBar value={dateFilter} onChange={setDateFilter} />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (error) {
    return <div className="bg-white p-6 rounded-xl border border-red-200 text-center text-red-600">{error}</div>;
  }

  if (exams.length === 0) {
    return (
      <div className="space-y-3">
        <DateFilterBar value={dateFilter} onChange={setDateFilter} />
        <EmptyState
          title="No exams scheduled"
          description={hasDateFilter(dateFilter) ? "No items for selected date range." : "No exams found for your class yet."}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DateFilterBar value={dateFilter} onChange={setDateFilter} />
      <div className="bg-slate-900/60 rounded-xl border border-white/10 overflow-hidden backdrop-blur-xl shadow-lg">
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Subject</th>
              <th className="text-left px-4 py-3 font-semibold">Exam Name</th>
              <th className="text-left px-4 py-3 font-semibold">Date</th>
              <th className="text-left px-4 py-3 font-semibold">Start Time</th>
              <th className="text-left px-4 py-3 font-semibold">End Time</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => (
              <tr key={exam._id} className="border-t border-white/10 hover:bg-white/5 transition">
                <td className="px-4 py-3 text-slate-100">{exam.subject}</td>
                <td className="px-4 py-3 text-slate-200">{exam.examName}</td>
                <td className="px-4 py-3 text-slate-200">{new Date(exam.date || exam.examDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-slate-200">{exam.startTime}</td>
                <td className="px-4 py-3 text-slate-200">{exam.endTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-white/10">
        {exams.map((exam) => (
          <div key={exam._id} className="p-4 space-y-1">
            <div className="text-sm font-semibold text-slate-100">{exam.subject}</div>
            <div className="text-sm text-slate-300">{exam.examName}</div>
            <div className="text-xs text-slate-400">Date: {new Date(exam.date || exam.examDate).toLocaleDateString()}</div>
            <div className="text-xs text-slate-400">Time: {exam.startTime} - {exam.endTime}</div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
