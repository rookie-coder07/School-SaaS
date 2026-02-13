import { useState, useEffect } from "react";

export default function SyllabusManager({ token, teacher }) {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [syllabuses, setSyllabuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch syllabuses on component mount
  useEffect(() => {
    fetchSyllabuses();
  }, []);

  const fetchSyllabuses = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/teacher/syllabus`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch syllabuses");
      const data = await res.json();
      setSyllabuses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Failed to load syllabuses");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject || !title) {
      setError("Subject and title are required");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("title", title);
      formData.append("description", description);
      if (file) {
        formData.append("file", file);
      }

      const res = await fetch(`${API_URL}/api/teacher/syllabus`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to add syllabus");
      const result = await res.json();

      setSuccess("Syllabus added successfully!");
      setSubject("");
      setTitle("");
      setDescription("");
      setFile(null);

      // Reset file input
      const fileInput = document.getElementById("syllabus-file-input");
      if (fileInput) fileInput.value = "";

      // Refresh list
      fetchSyllabuses();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to add syllabus");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (syllabusId) => {
    if (!window.confirm("Are you sure you want to delete this syllabus?")) return;

    try {
      const res = await fetch(`${API_URL}/api/teacher/syllabus/${syllabusId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete syllabus");
      setSuccess("Syllabus deleted successfully!");
      fetchSyllabuses();
    } catch (err) {
      console.error(err);
      setError("Failed to delete syllabus");
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Syllabus Form */}
      <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-5">Add New Syllabus</h3>

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
            {success}
          </div>
        )}

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
              <label className="block text-sm font-semibold text-slate-700 mb-2">Title *</label>
              <input
                type="text"
                placeholder="e.g., Algebra & Geometry"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
            <textarea
              placeholder="Enter syllabus description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Upload File (PDF/Image - Optional)</label>
            <input
              id="syllabus-file-input"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept=".pdf,.jpg,.jpeg,.png"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-xl transition"
          >
            {submitting ? "Uploading..." : "Add Syllabus"}
          </button>
        </form>
      </div>

      {/* Syllabus List */}
      <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-5">Syllabus List</h3>

        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading syllabus...</div>
        ) : syllabuses.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No syllabus added yet</div>
        ) : (
          <div className="space-y-3">
            {syllabuses.map((syl) => (
              <div key={syl._id} className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-600 uppercase tracking-wide">{syl.subject}</div>
                    <h4 className="text-lg font-bold text-slate-900 mt-1">{syl.title}</h4>
                    {syl.description && (
                      <p className="text-sm text-slate-600 mt-2 line-clamp-2">{syl.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      {syl.fileUrl && (
                        <a
                          href={`${API_URL}${syl.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-1 bg-blue-50 rounded-lg"
                        >
                          📄 View File
                        </a>
                      )}
                      <span className="text-xs text-slate-500">
                        {new Date(syl.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(syl._id)}
                    className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
