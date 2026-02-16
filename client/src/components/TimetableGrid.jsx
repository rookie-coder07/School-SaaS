import { useState, useEffect } from "react";
import { useToast } from "./ToastProvider";
import { createNotification } from "../utils/notificationHelper";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function TimetableGrid({ token, isTeacher = false, readOnly = false }) {
  const toast = useToast();
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [formData, setFormData] = useState({
    period: "",
    day: "",
    subject: "",
    startTime: "",
    endTime: "",
  });
  const [showForm, setShowForm] = useState(false);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const periods = Array.from({ length: 8 }, (_, i) => i + 1);

  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    setLoading(true);
    try {
      const endpoint = isTeacher ? "/api/teacher/timetable" : "/api/student/timetable";
      const res = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch timetable");
      const data = await res.json();
      setTimetable(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load timetable");
    } finally {
      setLoading(false);
    }
  };

  const getCellData = (period, day) => {
    return timetable.find(
      (t) => t.period === period && t.day === day
    );
  };

  const handleCellClick = (period, day) => {
    if (readOnly || !isTeacher) return;
    const existing = getCellData(period, day);
    setSelectedCell({ period, day });
    if (existing) {
      setFormData({
        period: existing.period,
        day: existing.day,
        subject: existing.subject,
        startTime: existing.startTime,
        endTime: existing.endTime,
      });
    } else {
      setFormData({
        period,
        day,
        subject: "",
        startTime: "",
        endTime: "",
      });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.subject || !formData.startTime || !formData.endTime) {
      toast.warning("Please fill all fields (Subject, Start Time, End Time)");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/teacher/timetable`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          period: parseInt(formData.period),
          day: formData.day,
          subject: formData.subject,
          startTime: formData.startTime,
          endTime: formData.endTime,
        }),
      });
      if (!res.ok) throw new Error("Failed to save timetable");
      toast.success("Timetable entry saved successfully!");

      // Create notification for timetable update
      try {
        await createNotification(
          "📅 Timetable Updated",
          `Timetable has been updated - ${formData.day}, Period ${formData.period}: ${formData.subject}`,
          "student",
          "info",
          token,
          null,
          { type: "timetable", day: formData.day, period: formData.period, subject: formData.subject }
        );
        console.log("✅ Notification created for timetable update");
      } catch (notifErr) {
        console.warn("⚠️ Failed to create notification (non-critical):", notifErr);
      }

      setShowForm(false);
      setSelectedCell(null);
      fetchTimetable();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save timetable entry");
    }
  };

  const handleDelete = async () => {
    if (!selectedCell) return;
    const existing = getCellData(selectedCell.period, selectedCell.day);
    if (!existing) return;

    if (!window.confirm("Delete this timetable entry?")) return;

    try {
      const res = await fetch(`${API_URL}/api/teacher/timetable/${existing._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Timetable entry deleted!");
      setShowForm(false);
      setSelectedCell(null);
      fetchTimetable();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete timetable entry");
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-500">Loading timetable...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Timetable Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm p-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-slate-300 bg-slate-100 p-2 font-bold text-slate-700 text-center">
                Period
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  className="border border-slate-300 bg-slate-100 p-2 font-bold text-slate-700 text-center min-w-24 md:min-w-32"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period}>
                <td className="border border-slate-300 bg-slate-50 p-2 font-bold text-slate-700 text-center">
                  Period {period}
                </td>
                {days.map((day) => {
                  const cellData = getCellData(period, day);
                  const isSelected = selectedCell?.period === period && selectedCell?.day === day;
                  return (
                    <td
                      key={`${period}-${day}`}
                      onClick={() => handleCellClick(period, day)}
                      className={`
                        border border-slate-300 p-3 text-center min-h-20 cursor-pointer transition
                        ${isSelected ? "bg-blue-100 border-blue-400" : "hover:bg-slate-50"}
                        ${readOnly || !isTeacher ? "" : "cursor-pointer"}
                      `}
                    >
                      {cellData ? (
                        <div className="text-xs md:text-sm">
                          <div className="font-bold text-slate-900">{cellData.subject}</div>
                          <div className="text-slate-600 text-xs mt-1">
                            {cellData.startTime} - {cellData.endTime}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">
                          {isTeacher && !readOnly ? "Click to add" : "—"}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Form Modal */}
      {showForm && selectedCell && !readOnly && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Edit Period {selectedCell.period} - {selectedCell.day}
            </h3>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>
              <input
                type="text"
                placeholder="e.g., Mathematics"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Start Time</label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">End Time</label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition"
              >
                Save
              </button>
              {getCellData(selectedCell.period, selectedCell.day) && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl transition"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
