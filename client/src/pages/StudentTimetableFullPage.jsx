import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ToastProvider";

const API_URL = import.meta.env.VITE_API_URL;

const processTimeTable = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    return { timeSlots: [], days: [], grid: {} };
  }

  const timeSlots = [...new Set(data.map((item) => item.time))].sort();
  const days = [...new Set(data.map((item) => item.day))].sort((a, b) => {
    const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return dayOrder.indexOf(a) - dayOrder.indexOf(b);
  });

  const grid = {};
  data.forEach((item) => {
    const key = `${item.time}-${item.day}`;
    grid[key] = item.subject || "Break";
  });

  return { timeSlots, days, grid };
};

const getSubjectColorClass = (subject) => {
  if (!subject || subject === "Break") return "bg-slate-600 text-slate-100 border-slate-500";

  const subjectMap = {
    math: "bg-blue-600 text-white border-blue-500",
    english: "bg-purple-600 text-white border-purple-500",
    science: "bg-emerald-600 text-white border-emerald-500",
    social: "bg-amber-600 text-white border-amber-500",
    computer: "bg-pink-600 text-white border-pink-500",
    hindi: "bg-orange-600 text-white border-orange-500",
    sports: "bg-cyan-600 text-white border-cyan-500",
    lunch: "bg-slate-700 text-slate-100 border-slate-600",
  };

  const lower = subject.toLowerCase();
  for (const [key, value] of Object.entries(subjectMap)) {
    if (lower.includes(key)) return value;
  }

  return "bg-indigo-600 text-white border-indigo-500";
};

const TimetableGridRenderer = ({ data }) => {
  if (!data.grid || data.days.length === 0) {
    return <div className="text-center text-slate-300 py-8">No timetable data available</div>;
  }

  return (
    <div className="overflow-x-auto min-w-full">
      <div
        className="grid gap-1 p-4 bg-slate-800/50 rounded-lg"
        style={{
          gridTemplateColumns: `120px repeat(${data.days.length}, minmax(140px, 1fr))`,
          minWidth: "900px",
        }}
      >
        {/* Header Row - Time */}
        <div className="font-bold text-slate-300 text-xs uppercase flex items-center justify-center bg-slate-700/60 rounded p-2 border border-slate-600">
          Time
        </div>

        {/* Header Row - Days */}
        {data.days.map((day) => (
          <div key={`header-${day}`} className="font-bold text-slate-100 text-xs uppercase flex items-center justify-center bg-slate-700/60 rounded p-2 border border-slate-600">
            {day}
          </div>
        ))}

        {/* Data Rows */}
        {data.timeSlots.map((timeSlot) => (
          <div key={`row-${timeSlot}`} className="contents">
            {/* Time Column */}
            <div className="font-semibold text-slate-200 text-xs flex items-center justify-center bg-slate-800/40 rounded p-2 border border-slate-600">
              {timeSlot}
            </div>

            {/* Subject Cells */}
            {data.days.map((day) => {
              const key = `${timeSlot}-${day}`;
              const subject = data.grid[key] || "—";
              return (
                <div
                  key={key}
                  className={`text-sm font-semibold rounded p-3 border flex items-center justify-center text-center min-h-12 ${getSubjectColorClass(
                    subject
                  )}`}
                >
                  {subject}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function StudentTimetableFullPage() {
  const navigate = useNavigate();
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentInfo, setStudentInfo] = useState({ name: "Student", class: "—", section: "—" });
  const toast = useToast();

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const token = localStorage.getItem("studentToken");
        if (!token) {
          navigate("/student/login");
          return;
        }

        // Get student info from localStorage
        const storedInfo = localStorage.getItem("studentInfo");
        if (storedInfo) {
          setStudentInfo(JSON.parse(storedInfo));
        }

        const res = await fetch(`${API_URL}/api/student/timetable`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch timetable");
        const data = await res.json();
        setTimetable(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Timetable fetch error:", err);
        toast.error("Failed to load timetable");
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-6">
        <ListSkeleton count={5} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4 sm:p-6 relative overflow-hidden">
      {/* Decorative gradient blurs */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-2000" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-300 hover:text-blue-200 font-semibold text-sm mb-4 flex items-center transition"
          >
            ← Back to Dashboard
          </button>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-5xl font-bold break-words text-white mb-2">Your Weekly Schedule</h1>
              <p className="text-blue-200 text-base font-semibold break-words whitespace-normal">
                Class {studentInfo.class} • Section {studentInfo.section} • Complete class timetable 📅
              </p>
            </div>
            <div className="w-full md:w-auto max-w-full md:max-w-sm min-w-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3">
              <p className="text-blue-100 text-sm break-words whitespace-normal">Student: <span className="font-bold text-white">{studentInfo.name}</span></p>
            </div>
          </div>
        </div>

        {/* Timetable Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-xl overflow-hidden">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Your Timetable</h2>
            <p className="text-blue-200 text-sm mt-1">View your complete daily schedule across all weekdays</p>
          </div>
          <TimetableGridRenderer data={processTimeTable(timetable)} />
        </div>

        {/* Error Section */}
        {error && (
          <div className="mt-6 p-6 bg-red-500/20 border border-red-300/40 rounded-xl text-center">
            <p className="text-red-100 font-semibold">Error: {error}</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
