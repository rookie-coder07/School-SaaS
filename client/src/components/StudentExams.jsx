import { useEffect, useState } from "react";
import DateFilterBar from "./DateFilterBar";
import { buildDateFilterQuery, hasDateFilter } from "../utils/dateFilterUtils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function StudentExams({ token }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" });

  useEffect(() => {
    fetchExams();
  }, [token, dateFilter.from, dateFilter.to]);

  const fetchExams = async () => {
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
  };

  if (loading) {
    return <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">Loading exam timetable...</div>;
  }

  if (error) {
    return <div className="bg-white p-6 rounded-xl border border-red-200 text-center text-red-600">{error}</div>;
  }

  if (exams.length === 0) {
    return (
      <div className="space-y-3">
        <DateFilterBar value={dateFilter} onChange={setDateFilter} />
        <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">
          {hasDateFilter(dateFilter) ? "No items for selected date range" : "No exams found for your class & section"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DateFilterBar value={dateFilter} onChange={setDateFilter} />
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
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
              <tr key={exam._id} className="border-t border-slate-200">
                <td className="px-4 py-3 text-slate-900">{exam.subject}</td>
                <td className="px-4 py-3 text-slate-700">{exam.examName}</td>
                <td className="px-4 py-3 text-slate-700">{new Date(exam.date || exam.examDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-slate-700">{exam.startTime}</td>
                <td className="px-4 py-3 text-slate-700">{exam.endTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-slate-200">
        {exams.map((exam) => (
          <div key={exam._id} className="p-4 space-y-1">
            <div className="text-sm font-semibold text-slate-900">{exam.subject}</div>
            <div className="text-sm text-slate-600">{exam.examName}</div>
            <div className="text-xs text-slate-500">Date: {new Date(exam.date || exam.examDate).toLocaleDateString()}</div>
            <div className="text-xs text-slate-500">Time: {exam.startTime} - {exam.endTime}</div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
