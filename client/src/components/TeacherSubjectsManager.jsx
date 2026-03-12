import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "./ToastProvider";

const API_URL = import.meta.env.VITE_API_URL;

export default function TeacherSubjectsManager({ token, className = "", section = "", onSubjectsChanged }) {
  const toast = useToast();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [filterClass, setFilterClass] = useState(className);
  const [filterSection, setFilterSection] = useState(section);

  const fetchSubjects = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (className) params.set("class", className);
      if (section) params.set("section", section);

      const res = await fetch(`${API_URL}/api/teacher/subjects?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch subjects");
      setSubjects(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Failed to load subjects");
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [token, className, section, toast]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    setFilterClass(className);
    setFilterSection(section);
  }, [className, section]);

  const filteredSubjects = useMemo(
    () =>
      subjects.filter((subj) => {
        const subjClass = String(subj?.class || "").trim();
        const subjSection = String(subj?.section || "").trim();
        const classMatch = !filterClass || subjClass === String(filterClass).trim();
        const sectionMatch = !filterSection || subjSection === String(filterSection).trim();
        return classMatch && sectionMatch;
      }),
    [subjects, filterClass, filterSection]
  );

  const resetForm = () => {
    setEditingId("");
    setSubjectName("");
  };

  const submitSubject = async () => {
    if (!subjectName.trim()) {
      toast.warning("Subject name is required");
      return;
    }

    try {
      setSaving(true);
      const isEdit = Boolean(editingId);
      const endpoint = isEdit ? `${API_URL}/api/teacher/subjects/${editingId}` : `${API_URL}/api/teacher/subjects`;
      const res = await fetch(endpoint, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: subjectName.trim(),
          class: className,
          section,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save subject");

      resetForm();
      await fetchSubjects();
      if (onSubjectsChanged) onSubjectsChanged();
      toast.success(isEdit ? "Subject updated" : "Subject added");
    } catch (err) {
      toast.error(err.message || "Failed to save subject");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (subject) => {
    setEditingId(String(subject?._id || ""));
    setSubjectName(String(subject?.name || subject?.subjectName || ""));
  };

  const deleteSubject = async (subject) => {
    const subjectId = String(subject?._id || "");
    if (!subjectId) return;
    const name = String(subject?.name || subject?.subjectName || "this subject");
    const ok = window.confirm(`Delete "${name}"? It will also be removed from exams, marks, and student dashboard.`);
    if (!ok) return;

    try {
      setDeletingId(subjectId);
      const res = await fetch(`${API_URL}/api/teacher/subjects/${subjectId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete subject");
      await fetchSubjects();
      if (onSubjectsChanged) onSubjectsChanged();
      toast.success("Subject deleted");
    } catch (err) {
      toast.error(err.message || "Failed to delete subject");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-lg">Subjects</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Class</label>
            <input value={className} disabled className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-slate-100" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Section</label>
            <input value={section} disabled className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-slate-100" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Filter</label>
            <div className="flex gap-2">
              <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full max-w-full sm:w-1/2 px-3 py-2.5 border border-slate-300 rounded-xl text-sm">
                <option value="">All class</option>
                <option value={className}>{className}</option>
              </select>
              <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)} className="w-full max-w-full sm:w-1/2 px-3 py-2.5 border border-slate-300 rounded-xl text-sm">
                <option value="">All section</option>
                <option value={section}>{section}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder="Subject name"
            className="md:col-span-3 px-3 py-2.5 border border-slate-300 rounded-xl text-sm"
          />
          <div className="flex gap-2">
            {editingId && (
              <button type="button" onClick={resetForm} className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm">
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={submitSubject}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Update" : "Add"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-900">Subject List</h4>
          {loading && <span className="text-xs text-slate-500">Loading...</span>}
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Subject</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Class</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Section</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-5 text-center text-slate-500">
                    No subjects found
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((subject) => (
                  <tr key={subject._id} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-slate-800 font-medium">{subject.name || subject.subjectName}</td>
                    <td className="px-4 py-3 text-slate-600">{subject.class}</td>
                    <td className="px-4 py-3 text-slate-600">{subject.section}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => startEdit(subject)} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700">
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSubject(subject)}
                          disabled={deletingId === String(subject._id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          {deletingId === String(subject._id) ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
