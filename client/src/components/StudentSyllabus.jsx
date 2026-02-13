import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function StudentSyllabus({ token }) {
  const [syllabuses, setSyllabuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSyllabuses();
  }, []);

  const fetchSyllabuses = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/student/syllabus`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch syllabus");
      const data = await res.json();
      setSyllabuses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Failed to load syllabus");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/50 text-center text-slate-500">
        Loading syllabus...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/50 text-center text-red-600">
        {error}
      </div>
    );
  }

  if (syllabuses.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/50 text-center text-slate-500">
        No syllabus available yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {syllabuses.map((syl) => (
        <div
          key={syl._id}
          className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 rounded-2xl border border-slate-200/50 shadow-sm hover:shadow-md transition"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-1">{syl.subject}</div>
              <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-3">{syl.title}</h3>
              
              {syl.description && (
                <p className="text-sm md:text-base text-slate-600 mb-4 line-clamp-3">{syl.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {syl.fileUrl && (
                  <a
                    href={`${API_URL}${syl.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold rounded-xl transition text-sm"
                  >
                    📄 View Document
                  </a>
                )}
                <span className="text-xs text-slate-500">
                  Added on {new Date(syl.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
