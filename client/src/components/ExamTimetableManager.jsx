import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "./ToastProvider";
import { createNotification } from "../utils/notificationHelper";
import DateFilterBar from "./DateFilterBar";
import { buildDateFilterQuery, hasDateFilter } from "../utils/dateFilterUtils";
import EmptyState from "./ui/EmptyState";
import { ListSkeleton } from "./ui/Skeleton";

const API_URL = import.meta.env.VITE_API_URL;

const emptyForm = {
  subject: "",
  examName: "",
  date: "",
  startTime: "",
  endTime: "",
  class: "",
  section: "",
};

export default function ExamTimetableManager({ token, teacher }) {
  const toast = useToast();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("add");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" });

  const teacherClass = String(teacher?.class || "").trim();
  const teacherSection = String(teacher?.section || "").trim();

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (teacherClass) params.set("class", teacherClass);
    if (teacherSection) params.set("section", teacherSection);
    const dateQuery = buildDateFilterQuery(dateFilter);
    if (dateQuery) {
      new URLSearchParams(dateQuery).forEach((v, k) => params.set(k, v));
    }
    return params.toString();
  }, [teacherClass, teacherSection, dateFilter]);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${API_URL}/api/teacher/exams${queryString ? `?${queryString}` : ""}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch exams");
      const examList = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setExams(examList);
    } catch (err) {
      console.error("EXAM FETCH ERROR:", err);
      toast.error(err.message || "Failed to load exam timetable");
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, [queryString, token, toast]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const openAddModal = () => {
    setMode("add");
    setEditingId(null);
    setForm({ ...emptyForm, class: teacherClass, section: teacherSection });
    setModalOpen(true);
  };

  const openEditModal = (exam) => {
    setMode("edit");
    setEditingId(exam._id);
    const dateValue = exam?.date || exam?.examDate || "";
    setForm({
      subject: exam.subject || "",
      examName: exam.examName || "",
      date: dateValue ? new Date(dateValue).toISOString().slice(0, 10) : "",
      startTime: exam.startTime || "",
      endTime: exam.endTime || "",
      class: exam.class || teacherClass,
      section: exam.section || teacherSection,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const onChangeForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveExam = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.examName || !form.date || !form.startTime || !form.endTime || !form.class || !form.section) {
      toast.warning("All fields are required");
      return;
    }

    const payload = {
      subject: form.subject.trim(),
      examName: form.examName.trim(),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      class: form.class.trim(),
      section: form.section.trim(),
    };

    try {
      setSaving(true);
      const isEdit = mode === "edit" && editingId;
      const url = isEdit ? `${API_URL}/api/teacher/exams/${editingId}` : `${API_URL}/api/teacher/exams`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${isEdit ? "update" : "add"} exam`);

      toast.success(isEdit ? "Exam updated" : "Exam added successfully");
      try {
        const dateLabel = form.date ? new Date(form.date).toLocaleDateString() : "TBA";
        await createNotification(
          isEdit ? "🗓️ Exam Updated" : "📝 New Exam Scheduled",
          `${form.examName} (${form.subject}) on ${dateLabel} ${form.startTime}-${form.endTime}`,
          "student",
          "exam",
          token,
          null,
          {
            type: "exam",
            examName: form.examName,
            subject: form.subject,
            date: form.date,
            startTime: form.startTime,
            endTime: form.endTime,
          }
        );
      } catch (notifErr) {
        console.warn("Failed to create exam notification (non-critical):", notifErr);
      }
      closeModal();
      fetchExams();
    } catch (err) {
      console.error("EXAM SAVE ERROR:", err);
      toast.error(err.message || "Failed to save exam");
    } finally {
      setSaving(false);
    }
  };

  const deleteExam = async (exam) => {
    if (!exam?._id) return;
    const confirmed = window.confirm("Are you sure you want to delete this exam row?");
    if (!confirmed) return;

    try {
      setDeletingId(exam._id);
      const res = await fetch(`${API_URL}/api/teacher/exams/${exam._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete exam");

      setExams((prev) => prev.filter((row) => row._id !== exam._id));
      toast.success("Exam deleted");
    } catch (err) {
      console.error("EXAM DELETE ERROR:", err);
      toast.error(err.message || "Failed to delete exam");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Exam Timetable</h3>
          <p className="text-xs text-slate-500 mt-1">
            Class: <span className="font-semibold">{teacherClass || "Not set"}</span> | Section: <span className="font-semibold">{teacherSection || "Not set"}</span>
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition cursor-pointer"
        >
          Add Exam
        </button>
      </div>
      <DateFilterBar value={dateFilter} onChange={setDateFilter} />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <ListSkeleton rows={3} />
          </div>
        ) : exams.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No exams scheduled"
              description={hasDateFilter(dateFilter) ? "No items for selected date range." : "No exams found for this class yet."}
            />
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Subject</th>
                    <th className="text-left px-4 py-3 font-semibold">Exam Name</th>
                    <th className="text-left px-4 py-3 font-semibold">Date</th>
                    <th className="text-left px-4 py-3 font-semibold">Start Time</th>
                    <th className="text-left px-4 py-3 font-semibold">End Time</th>
                    <th className="text-left px-4 py-3 font-semibold">Actions</th>
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(exam)}
                            className="px-3 py-2 rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-semibold text-xs cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteExam(exam)}
                            disabled={deletingId === exam._id}
                            className="px-3 py-2 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {deletingId === exam._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-200">
              {exams.map((exam) => (
                <div key={exam._id} className="p-4 space-y-2">
                  <div className="text-sm font-semibold text-slate-900">{exam.subject}</div>
                  <div className="text-sm text-slate-600">{exam.examName}</div>
                  <div className="text-xs text-slate-500">Date: {new Date(exam.date || exam.examDate).toLocaleDateString()}</div>
                  <div className="text-xs text-slate-500">Time: {exam.startTime} - {exam.endTime}</div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => openEditModal(exam)}
                      className="flex-1 px-3 py-2 rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-semibold text-sm cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteExam(exam)}
                      disabled={deletingId === exam._id}
                      className="flex-1 px-3 py-2 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {deletingId === exam._id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200">
              <h4 className="font-bold text-slate-900">{mode === "edit" ? "Edit Exam" : "Add Exam"}</h4>
            </div>

            <form onSubmit={saveExam} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                  <input
                    value={form.subject}
                    onChange={(e) => onChangeForm("subject", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Subject"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Name</label>
                  <input
                    value={form.examName}
                    onChange={(e) => onChangeForm("examName", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Exam name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => onChangeForm("date", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => onChangeForm("startTime", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => onChangeForm("endTime", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Class</label>
                  <input
                    value={form.class}
                    onChange={(e) => onChangeForm("class", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
                  <input
                    value={form.section}
                    onChange={(e) => onChangeForm("section", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Add Exam"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
