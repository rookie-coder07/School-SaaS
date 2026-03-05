import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "./ToastProvider";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const getStatusTone = (pct) => {
  if (pct > 75) return "text-emerald-700";
  if (pct >= 40) return "text-amber-700";
  return "text-rose-700";
};

export default function TeacherExamsMarksV2({ token, className, section, students: studentsProp = [], mode = "all" }) {
  const toast = useToast();
  const [students, setStudents] = useState(Array.isArray(studentsProp) ? studentsProp : []);
  const [subjectRecords, setSubjectRecords] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  const [exams, setExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState("");

  const [marksByStudent, setMarksByStudent] = useState({});
  const [marksLoading, setMarksLoading] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importReport, setImportReport] = useState(null);

  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [subjects, setSubjects] = useState([{ name: "", maxMarks: "", custom: false }]);
  const [formErrors, setFormErrors] = useState({});
  const [creatingExam, setCreatingExam] = useState(false);
  const [editingExamId, setEditingExamId] = useState("");

  const [deleteTargetExam, setDeleteTargetExam] = useState(null);
  const [deletingExamId, setDeletingExamId] = useState("");
  const [deletingSubjectKey, setDeletingSubjectKey] = useState("");
  const showManageExam = mode === "all" || mode === "manage";
  const showMarksEntry = mode === "all" || mode === "marks" || mode === "entry" || mode === "view";
  const isReadOnly = mode === "view";

  useEffect(() => {
    if (Array.isArray(studentsProp) && studentsProp.length > 0) {
      setStudents(studentsProp);
    }
  }, [studentsProp]);

  const fetchStudents = useCallback(async () => {
    if (!token || studentsProp.length > 0) return;
    try {
      const res = await fetch(`${API_URL}/api/teacher/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch students");
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Failed to load students");
      setStudents([]);
    }
  }, [token, studentsProp.length, toast]);

  const fetchTeacherSubjects = useCallback(async () => {
    if (!token || !className || !section) return;
    try {
      setSubjectsLoading(true);
      const params = new URLSearchParams({ class: className, section });
      const res = await fetch(`${API_URL}/api/teacher/subjects?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch subjects");
      const rows = Array.isArray(data) ? data : [];
      setSubjectRecords(rows);
      const names = rows
        .map((s) => String(s?.name || s?.subjectName || "").trim())
        .filter(Boolean);
      setSubjectOptions(Array.from(new Set(names)));
    } catch (err) {
      setSubjectRecords([]);
      setSubjectOptions([]);
      toast.error(err.message || "Failed to load subjects");
    } finally {
      setSubjectsLoading(false);
    }
  }, [token, className, section, toast]);

  const fetchExams = useCallback(async () => {
    if (!token || !className || !section) return;
    try {
      setExamsLoading(true);
      const params = new URLSearchParams({ scope: "marks", class: className, section });
      const res = await fetch(`${API_URL}/api/teacher/exams?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch exams");
      const exams = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setExams(exams);
    } catch (err) {
      toast.error(err.message || "Failed to load exams");
      setExams([]);
    } finally {
      setExamsLoading(false);
    }
  }, [token, className, section, toast]);

  // Stable callback deps prevent render-triggered refetch loops.
  useEffect(() => {
    fetchStudents();
    fetchTeacherSubjects();
    fetchExams();
  }, [fetchStudents, fetchTeacherSubjects, fetchExams]);

  const selectedExam = useMemo(
    () => exams.find((exam) => String(exam._id) === String(selectedExamId)) || null,
    [exams, selectedExamId]
  );

  const selectedExamSubjects = useMemo(() => {
    const rows = selectedExam?.subjects || [];
    return rows
      .map((s) => ({ name: String(s?.name || "").trim(), maxMarks: Number(s?.maxMarks || 0) }))
      .filter((s) => s.name && s.maxMarks > 0);
  }, [selectedExam]);

  const subjectCatalog = useMemo(() => {
    const merged = new Set([
      ...subjectOptions,
      ...exams.flatMap((exam) => (Array.isArray(exam.subjects) ? exam.subjects.map((s) => String(s?.name || "").trim()) : [])),
      "Maths",
      "English",
      "Science",
      "Social",
      "Computer Science",
    ]);
    return Array.from(merged).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [subjectOptions, exams]);

  const loadManualMarks = useCallback(async () => {
    if (!selectedExamId || !token) {
      setMarksByStudent({});
      return;
    }
    try {
      setMarksLoading(true);
      const res = await fetch(`${API_URL}/api/teacher/marks/manual?examId=${encodeURIComponent(selectedExamId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch existing marks");

      const next = {};
      Object.entries(data.marksByStudent || {}).forEach(([studentId, scores]) => {
        next[studentId] = {};
        (Array.isArray(scores) ? scores : []).forEach((score) => {
          const subjectName = String(score?.subject || "").trim();
          if (!subjectName) return;
          next[studentId][subjectName] =
            score?.obtained === null || score?.obtained === undefined || score?.obtained === ""
              ? ""
              : String(score.obtained);
        });
      });
      setMarksByStudent(next);
    } catch (err) {
      toast.error(err.message || "Failed to load marks");
      setMarksByStudent({});
    } finally {
      setMarksLoading(false);
    }
  }, [selectedExamId, token, toast]);

  useEffect(() => {
    loadManualMarks();
  }, [loadManualMarks]);

  useEffect(() => {
    if (!selectedExamId) return;
    const exists = exams.some((exam) => String(exam._id) === String(selectedExamId));
    if (!exists) {
      setSelectedExamId("");
      setMarksByStudent({});
      setImportReport(null);
    }
  }, [exams, selectedExamId]);

  const addSubjectRow = () => {
    setSubjects((prev) => [...prev, { name: "", maxMarks: "", custom: false }]);
  };

  const removeSubjectRow = (idx) => {
    setSubjects((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length > 0 ? next : [{ name: "", maxMarks: "", custom: false }];
    });
  };

  const updateSubjectRow = (idx, key, value) => {
    setSubjects((prev) => prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));
  };

  const normalizedFormSubjects = useMemo(
    () =>
      subjects
        .map((s) => ({ name: String(s.name || "").trim(), maxMarks: Number(s.maxMarks) }))
        .filter((s) => s.name && s.maxMarks > 0),
    [subjects]
  );

  const resetExamForm = useCallback(() => {
    setExamName("");
    setExamDate("");
    setSubjects([{ name: "", maxMarks: "", custom: false }]);
    setFormErrors({});
    setEditingExamId("");
  }, []);

  const validateExamForm = useCallback(() => {
    const nextErrors = {};
    if (!examName.trim()) nextErrors.examName = "Exam name is required";
    if (normalizedFormSubjects.length === 0) {
      nextErrors.subjects = "Add at least one subject with valid max marks";
    }
    const seen = new Set();
    normalizedFormSubjects.forEach((s) => {
      const key = s.name.toLowerCase();
      if (seen.has(key)) nextErrors.subjects = "Duplicate subjects are not allowed";
      seen.add(key);
    });
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [examName, normalizedFormSubjects]);

  const submitExam = async () => {
    if (!validateExamForm()) return;
    try {
      setCreatingExam(true);
      const isEdit = Boolean(editingExamId);
      const endpoint = isEdit ? `${API_URL}/api/teacher/exams/${editingExamId}?scope=marks` : `${API_URL}/api/teacher/exams?scope=marks`;
      const res = await fetch(endpoint, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: examName.trim(),
          date: examDate || null,
          class: className,
          section,
          subjects: normalizedFormSubjects,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          await fetchExams();
          throw new Error(data.error || "Exam already exists. Use a different name or delete the existing exam.");
        }
        throw new Error(data.error || `Failed to ${isEdit ? "update" : "create"} exam`);
      }

      toast.success(isEdit ? "Exam updated successfully" : "Exam created successfully");
      resetExamForm();
      await fetchExams();
    } catch (err) {
      toast.error(err.message || "Failed to save exam");
    } finally {
      setCreatingExam(false);
    }
  };

  const startEditExam = (exam) => {
    const examSubjects = Array.isArray(exam?.subjects) ? exam.subjects : [];
    const rows = examSubjects.length
      ? examSubjects.map((s) => {
          const name = String(s?.name || "").trim();
          return {
            name,
            maxMarks: s?.maxMarks ?? "",
            custom: !subjectCatalog.some((opt) => opt.toLowerCase() === name.toLowerCase()),
          };
        })
      : [{ name: "", maxMarks: "", custom: false }];
    setEditingExamId(String(exam?._id || ""));
    setExamName(String(exam?.name || ""));
    setExamDate(exam?.date ? new Date(exam.date).toISOString().slice(0, 10) : "");
    setSubjects(rows);
    setFormErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setCellScore = (studentId, subjectName, value) => {
    if (value !== "") {
      const numeric = Number(value);
      if (Number.isNaN(numeric)) return;
      value = numeric < 0 ? "0" : String(numeric);
    }
    setMarksByStudent((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectName]: value,
      },
    }));
  };

  const saveManualMarks = async () => {
    if (!selectedExam || selectedExamSubjects.length === 0) {
      toast.warning("Select an exam with valid subjects first");
      return;
    }
    try {
      setSavingMarks(true);
      const rows = students.map((student) => ({
        studentId: student._id,
        scores: selectedExamSubjects.map((subjectMeta) => ({
          subject: subjectMeta.name,
          obtained:
            marksByStudent?.[student._id]?.[subjectMeta.name] === "" || marksByStudent?.[student._id]?.[subjectMeta.name] === undefined
              ? null
              : Number(marksByStudent?.[student._id]?.[subjectMeta.name]),
        })),
      }));

      const res = await fetch(`${API_URL}/api/teacher/marks/manual`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examId: selectedExam._id,
          rows,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save marks");

      if (data.failedCount > 0) {
        toast.warning(`Saved ${data.savedCount}. ${data.failedCount} rows had validation errors.`);
      } else {
        toast.success("Marks saved");
      }
    } catch (err) {
      toast.error(err.message || "Failed to save marks");
    } finally {
      setSavingMarks(false);
    }
  };

  const importMarks = async () => {
    if (!selectedExamId) {
      toast.warning("Select exam first");
      return;
    }
    if (!importFile) {
      toast.warning("Choose an Excel or CSV file first");
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append("examId", selectedExamId);
      formData.append("file", importFile);

      const res = await fetch(`${API_URL}/api/teacher/marks/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      setImportReport(data);
      await loadManualMarks();
      toast.success(`Imported: ${data.savedCount}, Errors: ${data.failedCount}`);
    } catch (err) {
      toast.error(err.message || "Import failed");
      setImportReport(null);
    } finally {
      setImporting(false);
    }
  };

  const askDeleteExam = (exam) => {
    setDeleteTargetExam(exam);
  };

  const confirmDeleteExam = async () => {
    if (!deleteTargetExam?._id) return;
    const examId = String(deleteTargetExam._id);
    try {
      setDeletingExamId(examId);
      const res = await fetch(`${API_URL}/api/teacher/exams/${examId}?scope=marks`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete exam");

      setExams((prev) => prev.filter((e) => String(e._id) !== examId));
      if (String(selectedExamId) === examId) {
        setSelectedExamId("");
        setMarksByStudent({});
        setImportReport(null);
      }
      if (String(editingExamId) === examId) {
        resetExamForm();
      }
      setDeleteTargetExam(null);
      toast.success("Exam deleted successfully");
    } catch (err) {
      toast.error(err.message || "Failed to delete exam");
    } finally {
      setDeletingExamId("");
    }
  };

  const deleteSubjectFromExam = async (exam, subjectName) => {
    const examId = String(exam?._id || "");
    if (!examId || !subjectName) return;
    const currentSubjects = Array.isArray(exam.subjects) ? exam.subjects : [];
    if (currentSubjects.length <= 1) {
      toast.warning("An exam must have at least one subject");
      return;
    }

    const ok = window.confirm(`Delete subject "${subjectName}" from exam "${exam.name}"?`);
    if (!ok) return;

    const nextSubjects = currentSubjects.filter((s) => String(s?.name || "").trim().toLowerCase() !== String(subjectName).trim().toLowerCase());
    if (!nextSubjects.length) {
      toast.warning("An exam must have at least one subject");
      return;
    }

    const subjectKey = `${examId}:${subjectName}`;
    try {
      setDeletingSubjectKey(subjectKey);
      const res = await fetch(`${API_URL}/api/teacher/exams/${examId}?scope=marks`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: exam.name,
          date: exam.date || null,
          subjects: nextSubjects.map((s) => ({
            name: String(s?.name || "").trim(),
            maxMarks: Number(s?.maxMarks),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete subject");

      setExams((prev) =>
        prev.map((row) => (String(row._id) === examId ? { ...row, subjects: nextSubjects } : row))
      );

      if (String(selectedExamId) === examId) {
        await fetchExams();
      }
      toast.success(`Deleted ${subjectName}`);
    } catch (err) {
      toast.error(err.message || "Failed to delete subject");
    } finally {
      setDeletingSubjectKey("");
    }
  };

  const examTotals = useMemo(() => {
    if (!selectedExam || selectedExamSubjects.length === 0) return null;
    const totalMax = selectedExamSubjects.reduce((sum, subjectMeta) => sum + subjectMeta.maxMarks, 0);
    return { totalMax };
  }, [selectedExam, selectedExamSubjects]);

  const tableTotals = useMemo(() => {
    if (!selectedExamSubjects.length || !students.length) return null;
    const subjectTotals = {};
    selectedExamSubjects.forEach((subjectMeta) => {
      subjectTotals[subjectMeta.name] = students.reduce((sum, student) => {
        const raw = marksByStudent?.[student._id]?.[subjectMeta.name];
        const value = raw === "" || raw === undefined ? 0 : Number(raw);
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0);
    });
    const grandTotalObtained = Object.values(subjectTotals).reduce((sum, n) => sum + n, 0);
    const totalMaxPerStudent = selectedExamSubjects.reduce((sum, subjectMeta) => sum + subjectMeta.maxMarks, 0);
    const classTotalMax = totalMaxPerStudent * students.length;
    const classPercentage = classTotalMax > 0 ? (grandTotalObtained / classTotalMax) * 100 : 0;
    return { subjectTotals, grandTotalObtained, classTotalMax, classPercentage };
  }, [selectedExamSubjects, students, marksByStudent]);

  return (
    <div className="space-y-6">
      {showManageExam && (
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Create New Exam</h3>
          <p className="text-sm text-slate-600 mt-1">Create an exam with subject-wise max marks.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Exam Name</label>
            <input
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="Midterm"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {formErrors.examName && <p className="text-xs text-rose-600">{formErrors.examName}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Exam Date</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Subjects</label>
            {subjectsLoading && <span className="text-xs text-slate-500">Loading subject options...</span>}
          </div>
          {subjects.map((row, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              {!row.custom ? (
                <select
                  value={row.name}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === "__custom__") {
                      updateSubjectRow(idx, "custom", true);
                      updateSubjectRow(idx, "name", "");
                    } else {
                      updateSubjectRow(idx, "name", next);
                    }
                  }}
                  className="sm:col-span-6 px-3 py-2.5 border border-slate-300 rounded-xl text-sm"
                >
                  <option value="">Select Subject</option>
                  {subjectCatalog.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  <option value="__custom__">Other Subject</option>
                </select>
              ) : (
                <input
                  value={row.name}
                  onChange={(e) => updateSubjectRow(idx, "name", e.target.value)}
                  placeholder="Subject Name"
                  className="sm:col-span-6 px-3 py-2.5 border border-slate-300 rounded-xl text-sm"
                />
              )}
              <input
                type="number"
                min="1"
                value={row.maxMarks}
                onChange={(e) => updateSubjectRow(idx, "maxMarks", e.target.value)}
                placeholder="Max Marks"
                className="sm:col-span-3 px-3 py-2.5 border border-slate-300 rounded-xl text-sm"
              />
              <button
                onClick={() => removeSubjectRow(idx)}
                className="sm:col-span-3 px-3 py-2.5 text-sm rounded-xl bg-slate-100 hover:bg-slate-200"
                type="button"
              >
                Remove
              </button>
            </div>
          ))}
          {formErrors.subjects && <p className="text-xs text-rose-600">{formErrors.subjects}</p>}
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
          <button onClick={addSubjectRow} type="button" className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold">
            Add Subject
          </button>
          <div className="flex gap-2">
            {editingExamId && (
              <button onClick={resetExamForm} type="button" className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold">
                Cancel Edit
              </button>
            )}
            <button
              onClick={submitExam}
              disabled={creatingExam}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
              type="button"
            >
              {creatingExam ? "Saving..." : editingExamId ? "Update Exam" : "Create Exam"}
            </button>
          </div>
        </div>
      </div>
      )}

      {showManageExam && (
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-lg">Your Exams</h3>
          {examsLoading && <span className="text-xs text-slate-500">Loading exams...</span>}
        </div>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Exam Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Subjects</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.length === 0 && !examsLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-5 text-center text-slate-500">
                    No exams found. Create your first exam above.
                  </td>
                </tr>
              ) : (
                exams.map((exam) => (
                  <tr key={exam._id} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{exam.name || "Untitled"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {exam.date ? new Date(exam.date).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(exam.subjects) ? exam.subjects : []).map((subj) => {
                          const subName = String(subj?.name || "").trim();
                          const key = `${exam._id}:${subName}`;
                          return (
                            <span key={key} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs">
                              <span>{subName}</span>
                              <button
                                type="button"
                                title={`Delete ${subName}`}
                                onClick={() => deleteSubjectFromExam(exam, subName)}
                                disabled={deletingSubjectKey === key}
                                className="text-rose-600 hover:text-rose-700 disabled:opacity-50"
                              >
                                {deletingSubjectKey === key ? "..." : "x"}
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => startEditExam(exam)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => askDeleteExam(exam)}
                          disabled={deletingExamId === String(exam._id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          {deletingExamId === String(exam._id) ? "Deleting..." : "Delete"}
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
      )}

      {showMarksEntry && (
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-lg">{isReadOnly ? "View Marks" : "Enter / Import Marks"}</h3>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Select Exam</label>
          <select value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm">
            <option value="">Select Exam</option>
            {exams.map((exam) => (
              <option key={exam._id} value={exam._id}>
                {exam.name}
                {exam.date ? ` - ${new Date(exam.date).toLocaleDateString()}` : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedExam && (
          <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="font-medium">Subjects and Max Marks</div>
            <div className="mt-1 text-slate-600">
              {selectedExamSubjects.map((s) => `${s.name} (${s.maxMarks})`).join(", ") || "No subjects"}
            </div>
          </div>
        )}

        {!isReadOnly && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-slate-900">Import Marks from Excel</h4>
          <div className="text-sm text-slate-700">Upload an Excel or CSV file. Only matching columns will be used.</div>
          <div className="text-xs bg-white border border-slate-200 rounded-lg p-3 overflow-x-auto">
            RollNo | StudentName | Subject1 | Subject2 | ...
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="text-sm" />
            <button
              onClick={importMarks}
              disabled={importing || !selectedExamId || !importFile}
              type="button"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import"}
            </button>
          </div>
          {importReport && (
            <div className="text-xs text-slate-700">
              Imported {importReport.savedCount}, Failed {importReport.failedCount}
            </div>
          )}
        </div>
        )}

        {selectedExam && selectedExamSubjects.length > 0 && (
          <div className="space-y-3">
            {marksLoading ? (
              <div className="text-sm text-slate-500">Loading existing marks...</div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Student</th>
                      {selectedExamSubjects.map((subjectMeta) => (
                        <th key={subjectMeta.name} className="px-3 py-2 text-left whitespace-nowrap">
                          {subjectMeta.name}
                          <div className="text-[11px] text-slate-500">Max {subjectMeta.maxMarks}</div>
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const totalObtained = selectedExamSubjects.reduce((sum, subjectMeta) => {
                        const raw = marksByStudent?.[student._id]?.[subjectMeta.name];
                        const value = raw === "" || raw === undefined ? 0 : Number(raw);
                        return sum + (Number.isFinite(value) ? value : 0);
                      }, 0);
                      const percentage = examTotals?.totalMax ? (totalObtained / examTotals.totalMax) * 100 : 0;

                      return (
                        <tr key={student._id} className="border-t border-slate-200">
                          <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">{student.name}</td>
                          {selectedExamSubjects.map((subjectMeta) => (
                            <td key={`${student._id}-${subjectMeta.name}`} className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                max={subjectMeta.maxMarks}
                                value={marksByStudent?.[student._id]?.[subjectMeta.name] ?? ""}
                                disabled={isReadOnly}
                                onChange={(e) => {
                                  if (isReadOnly) return;
                                  const raw = e.target.value;
                                  if (raw === "") {
                                    setCellScore(student._id, subjectMeta.name, "");
                                    return;
                                  }
                                  const value = Number(raw);
                                  if (Number.isNaN(value)) return;
                                  const clamped = Math.min(subjectMeta.maxMarks, Math.max(0, value));
                                  setCellScore(student._id, subjectMeta.name, String(clamped));
                                }}
                                placeholder={`0 / ${subjectMeta.maxMarks}`}
                                className="w-28 px-2 py-1.5 border border-slate-300 rounded-md"
                              />
                            </td>
                          ))}
                          <td className={`px-3 py-2 text-xs font-semibold ${getStatusTone(percentage)}`}>
                            {totalObtained}/{examTotals?.totalMax || 0} ({Math.round(percentage)}%)
                          </td>
                        </tr>
                      );
                    })}
                    {tableTotals && (
                      <tr className="border-t-2 border-slate-300 bg-slate-50">
                        <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">Subject Totals</td>
                        {selectedExamSubjects.map((subjectMeta) => (
                          <td key={`total-${subjectMeta.name}`} className="px-3 py-2 text-xs font-semibold text-slate-700">
                            {tableTotals.subjectTotals[subjectMeta.name] || 0}
                          </td>
                        ))}
                        <td className={`px-3 py-2 text-xs font-semibold ${getStatusTone(tableTotals.classPercentage)}`}>
                          {tableTotals.grandTotalObtained}/{tableTotals.classTotalMax} ({Math.round(tableTotals.classPercentage)}%)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {!isReadOnly && (
              <div className="flex justify-end">
                <button
                  onClick={saveManualMarks}
                  disabled={savingMarks || !selectedExamId}
                  type="button"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {savingMarks ? "Saving..." : "Save Marks"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {deleteTargetExam && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-5 space-y-4">
            <h4 className="text-lg font-semibold text-slate-900">Delete Exam?</h4>
            <p className="text-sm text-slate-600">This will delete the exam and all its marks. Continue?</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetExam(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-semibold"
                disabled={Boolean(deletingExamId)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteExam}
                disabled={Boolean(deletingExamId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                {deletingExamId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
