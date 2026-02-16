import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useToast } from "../components/ToastProvider";
import ConfirmationModal from "../components/ConfirmationModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function DevSchoolDetails() {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [schoolData, setSchoolData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [confirming, setConfirming] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const token = localStorage.getItem("developerToken");

  useEffect(() => {
    if (!token) {
      navigate("/dev/login", { replace: true });
      return;
    }
    fetchSchoolDetails();
  }, [token, schoolId, navigate]);

  const fetchSchoolDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/api/dev/schools/${schoolId}/details`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSchoolData(response.data);
    } catch (err) {
      console.error("Error fetching school details:", err);
      toast?.error?.("Failed to load school details");
      navigate("/dev/schools");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirming?.userId) return;

    try {
      setDeleting(true);
      await axios.delete(`${API_URL}/api/dev/users/${confirming.userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Remove user from local state
      setSchoolData((prev) => ({
        ...prev,
        admins: prev.admins.filter((u) => u._id !== confirming.userId),
        teachers: prev.teachers.filter((u) => u._id !== confirming.userId),
        students: prev.students.filter((u) => u._id !== confirming.userId),
      }));

      toast?.success?.(`User "${confirming.userName}" deleted`);
      setConfirming(null);
    } catch (err) {
      console.error("Error deleting user:", err);
      toast?.error?.(err.response?.data?.error || "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteData = async (dataType) => {
    try {
      setDeleting(true);
      const response = await axios.delete(
        `${API_URL}/api/dev/schools/${schoolId}/data?type=${dataType}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast?.success?.(
        `Deleted ${response.data.deletedCount} ${dataType} records`
      );
      // Refresh school details
      await fetchSchoolDetails();
    } catch (err) {
      console.error("Error deleting data:", err);
      toast?.error?.(err.response?.data?.error || "Failed to delete data");
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !schoolData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading school details...</div>
      </div>
    );
  }

  const { school, stats, admins, teachers, students } = schoolData;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate("/dev/schools")}
            className="text-blue-600 hover:text-blue-700 text-sm font-semibold mb-2"
          >
            ← Back to Schools
          </button>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900">{school.name}</h1>
          <p className="text-slate-600 mt-2">ID: {school._id}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-black text-blue-600">{stats.totalStudents}</div>
          <div className="text-sm text-slate-600 mt-1">Students</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-black text-green-600">{stats.totalTeachers}</div>
          <div className="text-sm text-slate-600 mt-1">Teachers</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-black text-purple-600">{stats.totalAdmins}</div>
          <div className="text-sm text-slate-600 mt-1">Admins</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-3xl font-black text-slate-600">{stats.totalAttendance}</div>
          <div className="text-sm text-slate-600 mt-1">Attendance Records</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="bg-white border-b border-slate-200 rounded-t-xl">
          <div className="flex gap-2 p-4 overflow-x-auto">
            {[
              { id: "overview", label: "Overview" },
              { id: "admins", label: "Admins" },
              { id: "teachers", label: "Teachers" },
              { id: "students", label: "Students" },
              { id: "danger", label: "Danger Zone" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 font-semibold text-sm transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white p-6 rounded-b-xl border border-slate-200 border-t-0">
          {/* Overview */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-slate-900 mb-3">Data Records</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="text-2xl font-black text-slate-900">
                      {stats.totalHomework}
                    </div>
                    <div className="text-sm text-slate-600">Homework</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="text-2xl font-black text-slate-900">
                      {stats.totalAnnouncements}
                    </div>
                    <div className="text-sm text-slate-600">Announcements</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="text-2xl font-black text-slate-900">
                      {stats.totalMarks}
                    </div>
                    <div className="text-sm text-slate-600">Marks</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Admins List */}
          {activeTab === "admins" && (
            <div>
              <h3 className="font-bold text-slate-900 mb-4">
                Admins ({admins.length})
              </h3>
              {admins.length > 0 ? (
                <div className="space-y-3">
                  {admins.map((admin) => (
                    <div
                      key={admin._id}
                      className="flex items-center justify-between bg-slate-50 p-4 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">
                          {admin.name}
                        </div>
                        <div className="text-sm text-slate-600">{admin.email}</div>
                      </div>
                      <button
                        onClick={() =>
                          setConfirming({
                            userId: admin._id,
                            userName: admin.name,
                            userEmail: admin.email,
                          })
                        }
                        className="px-3 py-1 bg-red-50 text-red-600 text-sm font-semibold rounded hover:bg-red-100 transition"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">No admins</div>
              )}
            </div>
          )}

          {/* Teachers List */}
          {activeTab === "teachers" && (
            <div>
              <h3 className="font-bold text-slate-900 mb-4">
                Teachers ({teachers.length})
              </h3>
              {teachers.length > 0 ? (
                <div className="space-y-3">
                  {teachers.map((teacher) => (
                    <div
                      key={teacher._id}
                      className="flex items-center justify-between bg-slate-50 p-4 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">
                          {teacher.name}
                        </div>
                        <div className="text-sm text-slate-600">
                          {teacher.email} | {teacher.subject || "N/A"} | Class{" "}
                          {teacher.class} Section {teacher.section}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setConfirming({
                            userId: teacher._id,
                            userName: teacher.name,
                            userEmail: teacher.email,
                          })
                        }
                        className="px-3 py-1 bg-red-50 text-red-600 text-sm font-semibold rounded hover:bg-red-100 transition"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">No teachers</div>
              )}
            </div>
          )}

          {/* Students List */}
          {activeTab === "students" && (
            <div>
              <h3 className="font-bold text-slate-900 mb-4">
                Students ({students.length})
              </h3>
              {students.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {students.map((student) => (
                    <div
                      key={student._id}
                      className="flex items-center justify-between bg-slate-50 p-4 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">
                          {student.name}
                        </div>
                        <div className="text-sm text-slate-600">
                          {student.email} | Roll {student.rollNo} | Class{" "}
                          {student.class} Section {student.section}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setConfirming({
                            userId: student._id,
                            userName: student.name,
                            userEmail: student.email,
                          })
                        }
                        className="px-3 py-1 bg-red-50 text-red-600 text-sm font-semibold rounded hover:bg-red-100 transition"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">No students</div>
              )}
            </div>
          )}

          {/* Danger Zone */}
          {activeTab === "danger" && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <h3 className="font-bold text-red-900 mb-4">
                  ⚠️ Danger Zone - Delete Data
                </h3>
                <p className="text-sm text-red-800 mb-4">
                  Choose a data type to delete all records of that type for this
                  school. This action is irreversible.
                </p>
                <div className="space-y-2">
                  {[
                    { type: "attendance", label: "Delete All Attendance Records" },
                    { type: "homework", label: "Delete All Homework" },
                    {
                      type: "announcements",
                      label: "Delete All Announcements",
                    },
                    { type: "marks", label: "Delete All Marks" },
                    { type: "timetables", label: "Delete All Timetables" },
                    { type: "events", label: "Delete All Events" },
                  ].map((item) => (
                    <button
                      key={item.type}
                      onClick={() =>
                        setConfirming({
                          type: "deleteData",
                          dataType: item.type,
                          label: item.label,
                        })
                      }
                      disabled={deleting}
                      className="w-full px-4 py-2 bg-red-600 text-white font-semibold rounded hover:bg-red-700 transition disabled:opacity-50 text-sm"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal - Delete User */}
      <ConfirmationModal
        isOpen={!!confirming && confirming.type !== "deleteData"}
        title="Delete User"
        message={`Are you sure you want to delete "${confirming?.userName}"?`}
        warning="This action is irreversible. The user will be completely removed."
        confirmText="Delete User"
        isLoading={deleting}
        onConfirm={handleDeleteUser}
        onCancel={() => setConfirming(null)}
      />

      {/* Confirmation Modal - Delete Data */}
      <ConfirmationModal
        isOpen={!!confirming && confirming.type === "deleteData"}
        title={`Delete ${confirming?.label}`}
        message={`This will permanently delete all ${confirming?.label?.toLowerCase() || 'data'} for this school.`}
        warning="This action is irreversible"
        confirmText={`Delete ${confirming?.label?.split(" ")[2]}`}
        isLoading={deleting}
        onConfirm={() => handleDeleteData(confirming?.dataType)}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
