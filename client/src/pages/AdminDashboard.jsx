// ...existing code...
import { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";

export default function AdminDashboard() {
  const [teacherFile, setTeacherFile] = useState(null);
  const [studentFile, setStudentFile] = useState(null);
  const [admissionCount, setAdmissionCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // ===============================
  // FETCH ADMISSIONS COUNT
  // ===============================
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    fetch("http://localhost:5000/api/admissions", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data) => setAdmissionCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setAdmissionCount(0));
  }, []);

  // ===============================
  // UPLOAD TEACHERS
  // ===============================
  const uploadTeachers = async () => {
    if (!teacherFile) {
      alert("Select teacher Excel file");
      return;
    }

    const token = localStorage.getItem("adminToken");
    if (!token) return alert("Admin not logged in");

    const formData = new FormData();
    formData.append("file", teacherFile);

    setIsUploading(true);
    try {
      const res = await fetch("http://localhost:5000/api/admin/upload-teachers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const text = await res.text();
      if (!res.ok) {
        console.error("Teacher upload failed:", text);
        return alert("Teacher upload failed: " + (text || `status ${res.status}`));
      }

      alert("✅ Teachers uploaded successfully");
    } catch (err) {
      console.error(err);
      alert("Server error while uploading teachers: " + (err.message || err));
    } finally {
      setIsUploading(false);
    }
  };

  // ===============================
  // UPLOAD STUDENTS
  // ===============================
  const uploadStudents = async () => {
    if (!studentFile) {
      alert("Select student Excel file");
      return;
    }

    const token = localStorage.getItem("adminToken");
    if (!token) return alert("Admin not logged in");

    const formData = new FormData();
    formData.append("file", studentFile);

    setIsUploading(true);
    try {
      const res = await fetch("http://localhost:5000/api/admin/upload-students", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const text = await res.text();
      if (!res.ok) {
        console.error("Student upload failed:", text);
        return alert("Student upload failed: " + (text || `status ${res.status}`));
      }

      alert("✅ Students uploaded successfully");
    } catch (err) {
      console.error(err);
      alert("Server error while uploading students: " + (err.message || err));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex">
      <AdminSidebar />

      <div className="ml-64 p-8 w-full bg-gray-100 min-h-screen">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

        {/* STATS */}
        <div className="bg-white p-6 rounded shadow mb-6">
          <h2 className="text-lg font-semibold">Total Admissions: {admissionCount}</h2>
        </div>

        {/* TEACHER UPLOAD */}
        <div className="bg-white p-6 rounded shadow mb-6 w-[450px]">
          <h2 className="text-xl font-bold mb-4">Upload Teachers</h2>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setTeacherFile(e.target.files[0])}
            className="mb-4"
          />

          <button
            onClick={uploadTeachers}
            className="bg-blue-600 text-white px-6 py-2 rounded"
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload Teachers"}
          </button>
        </div>

        {/* STUDENT UPLOAD */}
        <div className="bg-white p-6 rounded shadow w-[450px]">
          <h2 className="text-xl font-bold mb-4">Upload Students</h2>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setStudentFile(e.target.files[0])}
            className="mb-4"
          />

          <button
            onClick={uploadStudents}
            className="bg-green-600 text-white px-6 py-2 rounded"
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload Students"}
          </button>
        </div>
      </div>
    </div>
  );
}
// ...existing