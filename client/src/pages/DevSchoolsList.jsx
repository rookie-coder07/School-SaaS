import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useToast } from "../components/ToastProvider";
import ConfirmationModal from "../components/ConfirmationModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function DevSchoolsList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const token = localStorage.getItem("developerToken");

  useEffect(() => {
    if (!token) {
      navigate("/dev/login", { replace: true });
      return;
    }
    fetchSchools();
  }, [token, navigate]);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/dev/schools`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSchools(response.data || []);
    } catch (err) {
      console.error("Error fetching schools:", err);
      toast?.error?.("Failed to load schools");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchool = async () => {
    if (!confirming?.schoolId) return;

    try {
      setDeleting(true);
      await axios.delete(`${API_URL}/api/dev/schools/${confirming.schoolId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSchools((prev) => prev.filter((s) => s._id !== confirming.schoolId));
      toast?.success?.(`School "${confirming.schoolName}" and all related data deleted`);
      setConfirming(null);
    } catch (err) {
      console.error("Error deleting school:", err);
      toast?.error?.(err.response?.data?.error || "Failed to delete school");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900">Schools</h1>
        <p className="text-slate-600 mt-2">Manage all schools across the platform</p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block text-slate-500">Loading schools...</div>
        </div>
      )}

      {/* Schools Grid */}
      {!loading && schools.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map((school) => (
            <div
              key={school._id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition p-6 flex flex-col"
            >
              {/* School Name */}
              <h3 className="text-lg font-bold text-slate-900 mb-2">{school.name}</h3>

              {/* School Code */}
              {school.code && (
                <p className="text-xs text-slate-500 mb-4">Code: {school.code}</p>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-2xl font-black text-blue-600">{school.totalStudents}</div>
                  <div className="text-xs text-slate-600 mt-1">Students</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-2xl font-black text-green-600">{school.totalTeachers}</div>
                  <div className="text-xs text-slate-600 mt-1">Teachers</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="text-2xl font-black text-purple-600">{school.totalAdmins}</div>
                  <div className="text-xs text-slate-600 mt-1">Admins</div>
                </div>
                <div className="bg-slate-100 rounded-lg p-3">
                  <div className="text-sm font-semibold text-slate-700">
                    {new Date(school.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">Created</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => navigate(`/dev/schools/${school._id}`)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  View Details
                </button>
                <button
                  onClick={() => setConfirming({ schoolId: school._id, schoolName: school.name })}
                  className="px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100 transition text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && schools.length === 0 && (
        <div className="text-center py-12">
          <div className="text-slate-500 text-lg">No schools found</div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!confirming}
        title="Delete School"
        message={`Are you sure you want to delete "${confirming?.schoolName}"? All students, teachers, and data will be permanently removed.`}
        warning="This action is irreversible"
        confirmText="Delete School"
        isLoading={deleting}
        onConfirm={handleDeleteSchool}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
