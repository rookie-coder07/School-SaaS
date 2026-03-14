import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCw } from "lucide-react";
import { ListSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ToastProvider";

const API_URL = import.meta.env.VITE_API_URL;

export default function StudentTimetableFullPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [timetableData, setTimetableData] = useState([]);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const isMobile = screenWidth < 768;

  // Get token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("studentToken");
    if (!storedToken) {
      toast.error("Please log in to view your timetable");
      navigate("/student/login");
      return;
    }
    setToken(storedToken);
  }, [navigate, toast]);

  // Fetch timetable data
  useEffect(() => {
    if (!token) return;

    const fetchTimetable = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/student/timetable`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          toast.warning("Failed to load timetable data");
          setTimetableData([]);
          return;
        }
        const data = await res.json();
        setTimetableData(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Timetable fetch error:", err);
        toast.error("Error loading timetable");
        setTimetableData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTimetable();
  }, [token, toast]);

  // Track screen width for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Process timetable data into grid structure
  const processedData = processTimeTable(timetableData);

  if (loading || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <ListSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/student/dashboard")}
              className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 transition duration-200"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Class Timetable</h1>
              <p className="text-sm text-slate-400 mt-1">Your weekly schedule in full view</p>
            </div>
          </div>
        </div>

        {/* Mobile Landscape Hint */}
        {isMobile && (
          <div className="mb-6 rounded-lg border border-blue-400/30 bg-blue-500/10 p-4 flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-400/20 flex-shrink-0">
              <RotateCw className="h-4 w-4 text-blue-300 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-100">Best Experience in Landscape</h3>
              <p className="text-xs text-blue-200/80 mt-1">
                Rotate your device to landscape for a better view of the complete timetable.
              </p>
            </div>
          </div>
        )}

        {/* Timetable Container - Horizontal Scroll */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 shadow-[0_14px_34px_rgba(2,6,23,0.38)] backdrop-blur-xl overflow-hidden">
          <div style={{ overflowX: "auto", overflowY: "hidden" }} className="w-full">
            <TimetableGridRenderer data={processedData} />
          </div>
        </div>

        {/* Mobile Instructions */}
        {isMobile && (
          <div className="mt-6 rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
            <p className="text-xs text-slate-300">
              💡 <span className="font-semibold">Swipe horizontally</span> to view all days and subjects
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Process timetable data into grid structure
 * Groups subjects by time slot and day
 */
function processTimeTable(data = []) {
  if (!Array.isArray(data) || data.length === 0) {
    return { timeSlots: [], days: [], grid: {} };
  }

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const timeSlots = [];
  const grid = {};

  // Collect all unique time slots
  const timeSet = new Set();
  data.forEach((entry) => {
    if (entry.time) {
      timeSet.add(entry.time);
    }
  });

  const sortedTimes = Array.from(timeSet).sort((a, b) => {
    const [aStart] = String(a).split("-");
    const [bStart] = String(b).split("-");
    return aStart.localeCompare(bStart);
  });

  timeSlots.push(...sortedTimes);

  // Build grid: key = "time|day", value = subject
  data.forEach((entry) => {
    const day = String(entry.day || "").trim();
    const time = String(entry.time || "").trim();
    const subject = String(entry.subject || "").trim();

    if (day && time && subject) {
      const key = `${time}|${day}`;
      grid[key] = subject;
    }
  });

  return { timeSlots, days, grid };
}

/**
 * Render timetable as a responsive grid/table
 */
function TimetableGridRenderer({ data }) {
  const { timeSlots, days, grid } = data;

  if (timeSlots.length === 0 || days.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-sm">No timetable data available. Contact your school administration.</p>
      </div>
    );
  }

  return (
    <div style={{ minWidth: "900px" }} className="p-6">
      {/* Header Row */}
      <div className="grid gap-0 border border-slate-700/50 rounded-lg overflow-hidden mb-6" style={{ gridTemplateColumns: `120px repeat(${days.length}, 1fr)` }}>
        {/* Time header */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-r border-slate-700/50 p-3 font-semibold text-slate-200 flex items-center justify-center min-h-[60px]">
          <div className="text-xs text-center">Time</div>
        </div>

        {/* Day headers */}
        {days.map((day) => (
          <div
            key={day}
            className="bg-gradient-to-br from-slate-800 to-slate-900 border-r border-slate-700/50 p-3 font-semibold text-sky-200 flex items-center justify-center min-h-[60px] last:border-r-0"
          >
            <div className="text-xs font-bold text-center">{day}</div>
          </div>
        ))}
      </div>

      {/* Time Slots - Rows */}
      {timeSlots.map((timeSlot, idx) => (
        <div
          key={timeSlot}
          className="grid gap-0 border border-slate-700/50 rounded-lg overflow-hidden mb-2"
          style={{ gridTemplateColumns: `120px repeat(${days.length}, 1fr)` }}
        >
          {/* Time cell */}
          <div className="bg-slate-800/40 border-r border-slate-700/50 p-3 font-semibold text-slate-300 flex items-center justify-center min-h-[80px]">
            <div className="text-xs text-center font-mono">{timeSlot}</div>
          </div>

          {/* Subject cells */}
          {days.map((day) => {
            const key = `${timeSlot}|${day}`;
            const subject = grid[key] || "";

            return (
              <div
                key={`${timeSlot}-${day}`}
                className={`border-r border-slate-700/50 p-3 flex items-center justify-center min-h-[80px] last:border-r-0 ${
                  subject
                    ? getSubjectColorClass(subject)
                    : "bg-slate-800/20 text-slate-600"
                }`}
              >
                {subject ? (
                  <div className="text-xs font-semibold text-center break-words">
                    {subject}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">-</div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * Get color class for subject based on name
 */
function getSubjectColorClass(subject = "") {
  const name = String(subject || "").toLowerCase().trim();

  if (name.includes("math")) {
    return "bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-l-2 border-l-blue-400 text-blue-100";
  }
  if (name.includes("english")) {
    return "bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-l-2 border-l-purple-400 text-purple-100";
  }
  if (name.includes("science")) {
    return "bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border-l-2 border-l-emerald-400 text-emerald-100";
  }
  if (name.includes("social") || name.includes("history") || name.includes("geography")) {
    return "bg-gradient-to-br from-amber-500/20 to-amber-600/20 border-l-2 border-l-amber-400 text-amber-100";
  }
  if (name.includes("computer") || name.includes("it") || name.includes("programming")) {
    return "bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border-l-2 border-l-cyan-400 text-cyan-100";
  }
  if (name.includes("hindi") || name.includes("language")) {
    return "bg-gradient-to-br from-rose-500/20 to-rose-600/20 border-l-2 border-l-rose-400 text-rose-100";
  }
  if (name.includes("physical") || name.includes("pe") || name.includes("sports")) {
    return "bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-l-2 border-l-orange-400 text-orange-100";
  }
  if (name.includes("break") || name.includes("lunch")) {
    return "bg-gradient-to-br from-slate-600/20 to-slate-700/20 border-l-2 border-l-slate-400 text-slate-200";
  }

  // Default color
  return "bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 border-l-2 border-l-indigo-400 text-indigo-100";
}
