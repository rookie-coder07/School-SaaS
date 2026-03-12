import { useState, useEffect, useCallback } from "react";
import { useToast } from "./ToastProvider";

const API_URL = import.meta.env.VITE_API_URL;

export default function ExamSyllabusManager({ token }) {
  const toast = useToast();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [undoing, setUndoing] = useState(false);

  // Create new exam form state
  const [newExamName, setNewExamName] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSyllabusText, setNewSyllabusText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch exams on mount
  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/teacher/exam-syllabus`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch exams");
      const data = await res.json();
      const examList = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setExams(examList);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load exam syllabuses");
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // ===== CREATE NEW EXAM =====
  const handleCreateNewExam = async (e) => {
    e.preventDefault();

    if (!newExamName.trim() || !newSubjectName.trim() || !newSyllabusText.trim()) {
      toast.warning("Exam name, subject name, and syllabus text are required");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/teacher/exam-syllabus`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          examName: newExamName.trim(),
          subjects: [
            {
              subjectName: newSubjectName.trim(),
              syllabusText: newSyllabusText.trim(),
            },
          ],
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create exam");
      }

      toast.success("Exam created successfully!");
      setNewExamName("");
      setNewSubjectName("");
      setNewSyllabusText("");
      fetchExams();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to create exam");
    } finally {
      setSubmitting(false);
    }
  };

  // ===== ADD SUBJECT TO EXISTING EXAM =====
  const handleAddSubjectToExam = async (examId, subjectName, syllabusText) => {
    if (!subjectName.trim() || !syllabusText.trim()) {
      toast.warning("Subject name and syllabus text are required");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/teacher/exam-syllabus/${examId}/subject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subjectName: subjectName.trim(),
          syllabusText: syllabusText.trim(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add subject");
      }

      toast.success("Subject added to exam!");
      fetchExams();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to add subject");
    }
  };

  // ===== UPDATE SUBJECT =====
  const handleUpdateSubject = async (examId, subjectId, newName, newText) => {
    if (!newName.trim() || !newText.trim()) {
      toast.warning("Subject name and syllabus text are required");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/teacher/exam-syllabus/${examId}/subject/${subjectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subjectName: newName.trim(),
          syllabusText: newText.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to update subject");

      toast.success("Subject updated!");
      setEditingSubjectId(null);
      fetchExams();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update subject");
    }
  };

  // ===== DELETE SUBJECT =====
  const handleDeleteSubject = async (examId, subjectId) => {
    if (!window.confirm("Delete this subject?")) return;

    try {
      const res = await fetch(`${API_URL}/api/teacher/exam-syllabus/${examId}/subject/${subjectId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete subject");

      toast.success("Subject deleted!");
      fetchExams();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to delete subject");
    }
  };

  // ===== DELETE EXAM =====
  const handleDeleteExam = async (examId) => {
    if (!window.confirm("Delete this entire exam? This cannot be undone.")) return;

    try {
      const snapshot = exams.find((exam) => exam._id === examId);
      const res = await fetch(`${API_URL}/api/teacher/exam-syllabus/${examId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete exam");

      setExams((prev) => prev.filter((exam) => exam._id !== examId));
      if (snapshot) setUndoStack((prev) => [...prev, { type: "DELETE", model: "exam-syllabus", data: snapshot, timestamp: Date.now() }]);
      toast.success("Exam deleted!", 10000, {
        actionLabel: "Undo",
        onAction: handleUndoDelete,
      });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to delete exam");
    }
  };

  const handleUndoDelete = async () => {
    if (!undoStack.length) return;
    const lastAction = undoStack[undoStack.length - 1];

    try {
      setUndoing(true);
      const res = await fetch(`${API_URL}/api/teacher/restore`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "exam-syllabus", data: lastAction.data }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore exam");
      setUndoStack((prev) => prev.slice(0, -1));
      fetchExams();
      toast.success("Restored successfully");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to undo");
    } finally {
      setUndoing(false);
    }
  };

  return (
    <div className="space-y-8">
      {undoStack.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleUndoDelete}
            disabled={undoing}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-amber-500/20 text-amber-200 border border-amber-400/40 hover:bg-amber-500/30 transition disabled:opacity-50"
          >
            {undoing ? "Undoing..." : `Undo (${undoStack.length})`}
          </button>
        </div>
      )}
      {/* ===== CREATE NEW EXAM SECTION ===== */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-white/10 shadow-sm">
        <h2 className="text-xl font-bold text-slate-100 mb-6">📝 Create New Exam</h2>

        <form onSubmit={handleCreateNewExam} className="space-y-6">
          {/* Exam Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Exam Name *
            </label>
            <input
              type="text"
              value={newExamName}
              onChange={(e) => setNewExamName(e.target.value)}
              placeholder="e.g., Mid Term, Final Exam, Unit Test 1"
              className="w-full px-4 py-3 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={submitting}
            />
          </div>

          {/* Subject Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              First Subject Name *
            </label>
            <input
              type="text"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="e.g., Mathematics, English, Science"
              className="w-full px-4 py-3 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={submitting}
            />
          </div>

          {/* Syllabus Text */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              Syllabus Content *
            </label>
            <textarea
              value={newSyllabusText}
              onChange={(e) => setNewSyllabusText(e.target.value)}
              placeholder="Enter the complete syllabus content..."
              className="w-full px-4 py-3 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 h-32 resize-none"
              disabled={submitting}
            />
            <p className="text-xs text-slate-400 mt-2">
              💡 You can add more subjects after creating the exam
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating..." : "✨ Create Exam"}
          </button>
        </form>
      </div>

      {/* ===== EXAMS LIST SECTION ===== */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 mb-6">Exam Syllabuses</h2>

        {loading ? (
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-white/10 text-center text-slate-400">
            Loading exam syllabuses...
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-white/10 text-center text-slate-400">
            No exam syllabuses created yet. Create one above to get started!
          </div>
        ) : (
          <div className="space-y-6">
            {exams.map((exam) => (
              <div
                key={exam._id}
                className="bg-slate-900/60 rounded-2xl border border-white/10 shadow-sm hover:shadow-md transition overflow-hidden"
              >
                {/* Exam Header */}
                <div className="p-6 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border-b border-white/10">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-100">{exam.examName}</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        📍 {exam.class}-{exam.section} • {exam.subjects?.length || 0} subjects
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteExam(exam._id)}
                      className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold rounded-lg transition text-sm"
                    >
                      🗑 Delete Exam
                    </button>
                  </div>
                </div>

                {/* Subjects Section */}
                <div className="p-6 space-y-4">
                  {exam.subjects && exam.subjects.length > 0 ? (
                    <div className="space-y-4">
                      {exam.subjects.map((subject) => (
                        <SubjectCard
                          key={subject._id}
                          subject={subject}
                          examId={exam._id}
                          isEditing={editingSubjectId === subject._id}
                          onStartEdit={() => setEditingSubjectId(subject._id)}
                          onCancelEdit={() => setEditingSubjectId(null)}
                          onUpdate={handleUpdateSubject}
                          onDelete={handleDeleteSubject}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No subjects added yet</p>
                  )}

                  {/* Add New Subject Section */}
                  <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-400/30 rounded-lg">
                    <h4 className="font-semibold text-slate-200 mb-4">➕ Add New Subject to {exam.examName}</h4>
                    <AddSubjectForm
                      examId={exam._id}
                      onSubmit={handleAddSubjectToExam}
                    />
                  </div>
                </div>

                {/* Metadata */}
                <div className="px-6 py-3 bg-slate-900/50 border-t border-white/10 text-xs text-slate-400">
                  Created on {new Date(exam.createdAt).toLocaleDateString()} •
                {exam.updatedAt && new Date(exam.updatedAt).getTime() !== new Date(exam.createdAt).getTime() && (
                    <>
                      {" "}
                      Updated {new Date(exam.updatedAt).toLocaleDateString()}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== SUBJECT CARD COMPONENT =====
function SubjectCard({
  subject,
  examId,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}) {
  const [editName, setEditName] = useState(subject.subjectName);
  const [editText, setEditText] = useState(subject.syllabusText);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(examId, subject._id, editName, editText);
    setSaving(false);
  };

  if (isEditing) {
    return (
      <div className="p-4 bg-amber-500/10 border-2 border-amber-400/40 rounded-lg space-y-3">
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">Subject Name</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-3 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-2">Syllabus Text</label>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full px-3 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 h-24 resize-none"
            disabled={saving}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "✓ Save"}
          </button>
          <button
            onClick={onCancelEdit}
            disabled={saving}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-200 font-semibold rounded-lg transition text-sm disabled:opacity-50"
          >
            ✕ Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-900/50 border border-white/10 rounded-lg">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h4 className="font-bold text-slate-100">{subject.subjectName}</h4>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={onStartEdit}
            className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-sm font-semibold rounded transition"
          >
            ✎ Edit
          </button>
          <button
            onClick={() => onDelete(examId, subject._id)}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-sm font-semibold rounded transition"
          >
            🗑 Delete
          </button>
        </div>
      </div>
      <p className="text-sm text-slate-300 whitespace-pre-wrap">{subject.syllabusText}</p>
    </div>
  );
}

// ===== ADD SUBJECT FORM COMPONENT =====
function AddSubjectForm({ examId, onSubmit }) {
  const toast = useToast();
  const [subjectName, setSubjectName] = useState("");
  const [syllabusText, setSyllabusText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!subjectName.trim() || !syllabusText.trim()) {
      toast.warning("Subject name and syllabus text are required");
      return;
    }

    setSubmitting(true);
    await onSubmit(examId, subjectName, syllabusText);
    setSubmitting(false);

    if (!submitting) {
      setSubjectName("");
      setSyllabusText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        value={subjectName}
        onChange={(e) => setSubjectName(e.target.value)}
        placeholder="Subject name..."
        className="w-full px-3 py-2 border border-emerald-400/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
        disabled={submitting}
      />
      <textarea
        value={syllabusText}
        onChange={(e) => setSyllabusText(e.target.value)}
        placeholder="Syllabus content..."
        className="w-full px-3 py-2 border border-emerald-400/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 h-20 resize-none text-sm"
        disabled={submitting}
      />
      <button
        type="submit"
        disabled={submitting}
        className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition disabled:opacity-50 text-sm"
      >
        {submitting ? "Adding..." : "✨ Add Subject"}
      </button>
    </form>
  );
}



