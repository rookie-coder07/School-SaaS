import { useEffect, useState } from "react";

export default function TeacherDashboard() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});

  const token = localStorage.getItem("teacherToken");

  useEffect(() => {
    fetch(
      "http://localhost:5000/api/attendance/class?className=Class 5&section=A",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
      .then(res => res.json())
      .then(setStudents);
  }, []);

  function toggle(id, status) {
    setAttendance({ ...attendance, [id]: status });
  }

  async function submit() {
    await fetch("http://localhost:5000/api/attendance/mark", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        date: new Date().toISOString().split("T")[0],
        className: "Class 5",
        section: "A",
        records: students.map(s => ({
          studentUserId: s.userId,
          status: attendance[s.userId] || "ABSENT",
        })),
      }),
    });

    alert("Attendance submitted");
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Class 5 - Section A</h1>

      <div className="space-y-3">
        {students.map(s => (
          <div
            key={s.userId}
            className="flex justify-between items-center p-4 bg-white rounded shadow"
          >
            <span>{s.rollNo}</span>

            <div className="space-x-3">
              <button
                onClick={() => toggle(s.userId, "PRESENT")}
                className="px-4 py-1 bg-green-600 text-white rounded"
              >
                Present
              </button>
              <button
                onClick={() => toggle(s.userId, "ABSENT")}
                className="px-4 py-1 bg-red-600 text-white rounded"
              >
                Absent
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={submit}
        className="mt-6 w-full bg-blue-600 text-white py-3 rounded text-lg"
      >
        Submit Attendance
      </button>
    </div>
  );
}
