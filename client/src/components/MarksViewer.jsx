import { useState, useEffect, useCallback } from "react";
import { useToast } from "./ToastProvider";

export default function MarksViewer({ token, teacher }) {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const toast = useToast();
  const [marks, setMarks] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterExam, setFilterExam] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [selectedMarks, setSelectedMarks] = useState({});

  // Fetch marks and students on mount
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [marksRes, studentsRes] = await Promise.all([
        fetch(`${API_URL}/api/teacher/marks`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/teacher/students`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!marksRes.ok) throw new Error("Failed to fetch marks");
      if (!studentsRes.ok) throw new Error("Failed to fetch students");

      const marksData = await marksRes.json();
      const studentsData = await studentsRes.json();

      // Enrich marks with student names
      const enrichedMarks = Array.isArray(marksData) ? marksData.map(mark => ({
        ...mark,
        name: studentsData.find(s => String(s._id) === String(mark.studentId))?.name || "Unknown Student",
      })) : [];

      setMarks(enrichedMarks);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchMarks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/teacher/marks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch marks");
      const data = await res.json();
      const enrichedMarks = Array.isArray(data) ? data.map(mark => ({
        ...mark,
        name: students.find(s => String(s._id) === String(mark.studentId))?.name || "Unknown Student",
      })) : [];
      setMarks(enrichedMarks);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load marks");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMark = (markId) => {
    setSelectedMarks(prev => ({
      ...prev,
      [markId]: !prev[markId],
    }));
  };

  const handleSelectAll = (groupKey) => {
    const group = groupedMarks[groupKey];
    if (!group) return;

    const allSelected = group.marks.every(m => selectedMarks[m._id]);
    const newSelection = { ...selectedMarks };

    group.marks.forEach(mark => {
      if (allSelected) {
        delete newSelection[mark._id];
      } else {
        newSelection[mark._id] = true;
      }
    });

    setSelectedMarks(newSelection);
  };

  const handleBulkDelete = async (groupKey) => {
    const group = groupedMarks[groupKey];
    const marksToDelete = group.marks.filter(m => selectedMarks[m._id]);

    if (marksToDelete.length === 0) {
      toast.warning("No marks selected for deletion");
      return;
    }

    if (!window.confirm(`Delete ${marksToDelete.length} mark(s)?`)) return;

    setDeleting(true);
    try {
      // Get all marks for this subject/exam except the ones to delete
      const marksToDeleteIds = marksToDelete.map(m => m._id);
      const remainingMarks = marks.filter(m =>
        (m.subject !== group.subject || m.exam !== group.exam || !marksToDeleteIds.includes(m._id))
      );

      // Get marks for this subject/exam that are NOT being deleted
      const marksToKeep = remainingMarks.filter(m =>
        m.subject === group.subject && m.exam === group.exam
      );

      // Re-save marks without the deleted ones
      const records = marksToKeep.map(m => ({
        studentId: m.studentId,
        marks: m.score === "ABSENT" ? "ABSENT" : m.score,
      }));

      const res = await fetch(`${API_URL}/api/teacher/marks/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: group.subject,
          exam: group.exam,
          className: teacher.class,
          section: teacher.section,
          records,
        }),
      });

      if (!res.ok) throw new Error("Failed to delete marks");

      toast.success(`${marksToDelete.length} mark(s) deleted successfully!`);
      setSelectedMarks({});
      fetchMarks();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to delete marks");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteMark = async (markId) => {
    if (!window.confirm("Delete this mark?")) return;

    const markToDelete = marks.find(m => m._id === markId);
    if (!markToDelete) return;

    setDeleting(true);
    try {
      // Get all marks for this subject/exam except the one to delete
      const remainingMarks = marks.filter(m =>
        m.subject === markToDelete.subject &&
        m.exam === markToDelete.exam &&
        m._id !== markId
      );

      // Re-save marks without the deleted one
      const records = remainingMarks.map(m => ({
        studentId: m.studentId,
        marks: m.score === "ABSENT" ? "ABSENT" : m.score,
      }));

      const res = await fetch(`${API_URL}/api/teacher/marks/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: markToDelete.subject,
          exam: markToDelete.exam,
          className: teacher.class,
          section: teacher.section,
          records,
        }),
      });

      if (!res.ok) throw new Error("Failed to delete mark");

      toast.success("Mark deleted successfully!");
      fetchMarks();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to delete mark");
    } finally {
      setDeleting(false);
    }
  };

  // Get unique values for filters
  const subjects = [...new Set(marks.map(m => m.subject))];
  const exams = [...new Set(marks.map(m => m.exam))];

  // Filter marks
  const filteredMarks = marks.filter(m => {
    const matchesSearch = searchTerm === "" ||
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.studentId?.toString().includes(searchTerm);
    const matchesSubject = filterSubject === "" || m.subject === filterSubject;
    const matchesExam = filterExam === "" || m.exam === filterExam;
    return matchesSearch && matchesSubject && matchesExam;
  });

  // Group marks by subject and exam
  const groupedMarks = filteredMarks.reduce((acc, mark) => {
    const key = `${mark.subject}|${mark.exam}`;
    if (!acc[key]) {
      acc[key] = { subject: mark.subject, exam: mark.exam, marks: [] };
    }
    acc[key].marks.push(mark);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">🔍 Filter Marks</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Search Student</label>
            <input
              type="text"
              placeholder="Student name or ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Subjects</option>
              {subjects.map(subj => (
                <option key={subj} value={subj}>{subj}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Exam</label>
            <select
              value={filterExam}
              onChange={(e) => setFilterExam(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Exams</option>
              {exams.map(exam => (
                <option key={exam} value={exam}>{exam}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {filteredMarks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl shadow-sm p-6">
            <div className="text-sm font-semibold text-blue-700 uppercase">Total Entries</div>
            <div className="text-3xl font-bold text-blue-900 mt-2">{filteredMarks.length}</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl shadow-sm p-6">
            <div className="text-sm font-semibold text-emerald-700 uppercase">Groups</div>
            <div className="text-3xl font-bold text-emerald-900 mt-2">{Object.keys(groupedMarks).length}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl shadow-sm p-6">
            <div className="text-sm font-semibold text-purple-700 uppercase">Average</div>
            <div className="text-3xl font-bold text-purple-900 mt-2">
              {Math.round(filteredMarks.reduce((sum, m) => sum + (isNaN(m.score) ? 0 : m.score), 0) / filteredMarks.length)}
            </div>
          </div>
        </div>
      )}

      {/* Marks List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading marks...</div>
      ) : filteredMarks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm p-12 text-center">
          <div className="text-5xl mb-3">📊</div>
          <p className="text-slate-600 font-semibold">No marks found</p>
          <p className="text-sm text-slate-500 mt-1">try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedMarks).map(([key, group]) => {
            const groupSelectedCount = group.marks.filter(m => selectedMarks[m._id]).length;
            const allGroupSelected = group.marks.length > 0 && group.marks.every(m => selectedMarks[m._id]);
            const someGroupSelected = groupSelectedCount > 0 && !allGroupSelected;

            return (
            <div key={key} className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden">
              {/* Group Header */}
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">{group.subject}</h3>
                    <p className="text-sm text-slate-600 mt-1">📋 {group.exam} • {group.marks.length} marks</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {groupSelectedCount > 0 && (
                      <>
                        <div className="text-right">
                          <div className="text-xs font-semibold text-slate-600 uppercase">Selected</div>
                          <div className="text-lg font-bold text-blue-600">{groupSelectedCount}/{group.marks.length}</div>
                        </div>
                        <button
                          onClick={() => handleBulkDelete(key)}
                          disabled={deleting}
                          className="px-4 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-semibold transition disabled:opacity-50 whitespace-nowrap"
                          title={`Delete ${groupSelectedCount} selected mark(s)`}
                        >
                          🗑️ Delete ({groupSelectedCount})
                        </button>
                      </>
                    )}
                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-600 uppercase">Average</div>
                      <div className="text-2xl font-bold text-blue-600 mt-1">
                        {Math.round(group.marks.reduce((sum, m) => sum + (isNaN(m.score) ? 0 : m.score), 0) / group.marks.length)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Marks Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allGroupSelected}
                            ref={el => {
                              if (el && someGroupSelected) {
                                el.indeterminate = true;
                              }
                            }}
                            onChange={() => handleSelectAll(key)}
                            className="w-4 h-4 rounded border-slate-300"
                          />
                          <span>Student</span>
                        </label>
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">Marks</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.marks.map((mark) => (
                      <tr key={mark._id} className={`border-b border-slate-100 transition ${selectedMarks[mark._id] ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!selectedMarks[mark._id]}
                              onChange={() => handleToggleMark(mark._id)}
                              className="w-4 h-4 rounded border-slate-300"
                            />
                            <div>
                              <div>{mark.name}</div>
                              <div className="text-xs text-slate-500 mt-1">ID: {mark.studentId}</div>
                            </div>
                          </label>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className={`text-lg font-bold ${
                            mark.score === "ABSENT" ? "text-red-600" :
                            mark.score >= 80 ? "text-emerald-600" :
                            mark.score >= 60 ? "text-blue-600" :
                            "text-orange-600"
                          }`}>
                            {mark.score}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            mark.score === "ABSENT"
                              ? "bg-red-100 text-red-700"
                              : mark.score >= 80
                              ? "bg-emerald-100 text-emerald-700"
                              : mark.score >= 60
                              ? "bg-blue-100 text-blue-700"
                              : "bg-orange-100 text-orange-700"
                          }`}>
                            {mark.score === "ABSENT" ? "Absent" : mark.score >= 80 ? "Excellent" : mark.score >= 60 ? "Good" : "Needs Help"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteMark(mark._id)}
                            disabled={deleting}
                            className="px-3 py-1 rounded-lg hover:bg-red-100 text-red-600 transition disabled:opacity-50"
                            title="Delete this mark"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
