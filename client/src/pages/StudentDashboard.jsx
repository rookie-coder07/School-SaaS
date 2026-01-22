import { useEffect, useState } from "react";

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [marks, setMarks] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("studentToken");

    if (!token) {
      alert("Session expired. Please login again.");
      window.location.href = "/student/login";
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    async function fetchData() {
      try {
        // 👤 STUDENT PROFILE
        const profileRes = await fetch(
          "http://localhost:5000/api/student/me",
          { headers }
        );
        const profileData = await profileRes.json();
        if (!profileRes.ok) throw new Error(profileData.error);
        setStudent(profileData);

        // 📊 MARKS
        const marksRes = await fetch(
          "http://localhost:5000/api/student/marks",
          { headers }
        );
        const marksData = await marksRes.json();
        if (marksRes.ok) setMarks(marksData);

        // 🟢 ATTENDANCE
        const attendanceRes = await fetch(
          "http://localhost:5000/api/attendance/me",
          { headers }
        );
        const attendanceData = await attendanceRes.json();
        if (attendanceRes.ok) setAttendance(attendanceData);

      } catch (err) {
        console.error("Dashboard error:", err.message);
        alert("Failed to load dashboard. Please login again.");
        localStorage.removeItem("studentToken");
        window.location.href = "/student/login";
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <p className="p-6">Loading dashboard...</p>;
  }

  if (!student) {
    return <p className="p-6 text-red-600">Student data not found</p>;
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">Student Dashboard</h1>

      {/* PROFILE */}
      <div className="bg-gray-100 p-4 rounded">
        <p><b>Roll No:</b> {student.rollNo}</p>
        <p><b>Class:</b> {student.class}</p>
        <p><b>Section:</b> {student.section}</p>
      </div>

      {/* ATTENDANCE */}
      <div>
        <h2 className="text-2xl font-semibold mb-3">Attendance</h2>

        {attendance.length === 0 ? (
          <p>No attendance records available</p>
        ) : (
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">Date</th>
                <th className="border p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((a, i) => (
                <tr key={i}>
                  <td className="border p-2">
                    {new Date(a.date).toLocaleDateString()}
                  </td>
                  <td className="border p-2">{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MARKS */}
      <div>
        <h2 className="text-2xl font-semibold mb-3">Marks</h2>

        {marks.length === 0 ? (
          <p>No marks available</p>
        ) : (
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">Subject</th>
                <th className="border p-2">Exam</th>
                <th className="border p-2">Marks</th>
              </tr>
            </thead>
            <tbody>
              {marks.map((m, i) => (
                <tr key={i}>
                  <td className="border p-2">{m.subject}</td>
                  <td className="border p-2">{m.exam}</td>
                  <td className="border p-2">{m.marks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
