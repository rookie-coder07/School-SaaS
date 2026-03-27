import { useEffect, useState, useRef, memo } from "react";
import { useNavigate } from "react-router-dom";
import { ListSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ToastProvider";
import { ChevronLeft, ChevronRight } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

const processTimeTable = (data, configDays = [], configRows = []) => {
  const entries = Array.isArray(data) ? data : [];
  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  let days = [
    ...new Set(
      [...(Array.isArray(configDays) ? configDays : []), ...entries.map((item) => item.day)].filter(Boolean)
    ),
  ].sort((a, b) => {
    const ai = dayOrder.indexOf(a);
    const bi = dayOrder.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  // If nothing is configured, fall back to a predictable weekday list so the UI always shows days
  if (days.length === 0) {
    days = dayOrder.slice(0, 5);
  }

  const periodsMap = new Map();

  const configPeriodRows = (Array.isArray(configRows) ? configRows : []).filter((row) => row.type === "period");
  configPeriodRows.forEach((row, idx) => {
    const periodNumber = idx + 1;
    const timeValue =
      (row.startTime && row.endTime ? `${row.startTime}-${row.endTime}` : "") || "--";
    if (!periodsMap.has(periodNumber)) {
      periodsMap.set(periodNumber, {
        period: periodNumber,
        time: timeValue,
        subjects: {},
      });
    }
  });

  entries.forEach((item) => {
    const periodNumber = Number(item.period) || 0;
    const day = item.day;
    if (!periodNumber || !day) return;

    const timeValue =
      item.time ||
      (item.startTime && item.endTime ? `${item.startTime}-${item.endTime}` : "--");

    if (!periodsMap.has(periodNumber)) {
      periodsMap.set(periodNumber, {
        period: periodNumber,
        time: timeValue,
        subjects: {},
      });
    }

    const entry = periodsMap.get(periodNumber);
    if (!entry.time || entry.time === "--" || entry.time === "\u2014") entry.time = timeValue;
    entry.subjects[day] = item.subject?.trim() || "Free Period";
  });

  const periods = Array.from(periodsMap.values()).sort((a, b) => a.period - b.period);

  const dayPeriods = {};
  days.forEach((day) => {
    dayPeriods[day] = periods.map((p) => {
      const subject = p.subjects[day] || "Free Period";
      return {
        period: p.period,
        time: p.time,
        subject,
        isFree: subject === "Free Period",
      };
    });
  });

  return { days, periods, dayPeriods };
};

const getSubjectColorClass = (subject, isFree = false) => {
  if (isFree || !subject || subject === "Break" || subject === "Free Period") {
    return "bg-white/8 text-slate-100 border-white/15 backdrop-blur";
  }

  const subjectMap = {
    math: "bg-blue-500/85 text-white border-blue-400/80 backdrop-blur",
    english: "bg-purple-500/85 text-white border-purple-400/80 backdrop-blur",
    science: "bg-emerald-500/85 text-white border-emerald-400/80 backdrop-blur",
    social: "bg-amber-500/85 text-white border-amber-400/80 backdrop-blur",
    computer: "bg-pink-500/85 text-white border-pink-400/80 backdrop-blur",
    hindi: "bg-orange-500/85 text-white border-orange-400/80 backdrop-blur",
    sports: "bg-cyan-500/85 text-white border-cyan-400/80 backdrop-blur",
    lunch: "bg-white/8 text-slate-100 border-white/15 backdrop-blur",
  };

  const lower = subject.toLowerCase();
  for (const [key, value] of Object.entries(subjectMap)) {
    if (lower.includes(key)) return value;
  }

  return "bg-indigo-500/85 text-white border-indigo-400/80 backdrop-blur";
};

const TimetableGridRenderer = memo(function TimetableGridRenderer({ data }) {
  if (!Array.isArray(data.periods) || data.periods.length === 0) {
    return (
      <div className="text-center text-slate-300 py-8 space-y-3">
        <p className="font-semibold text-slate-100">No classes scheduled yet.</p>
        {Array.isArray(data.days) && data.days.length > 0 ? (
          <div className="flex flex-wrap gap-2 justify-center">
            {data.days.map((day) => (
              <span key={day} className="px-3 py-1 rounded-full bg-slate-700/60 text-slate-200 text-xs border border-slate-600">
                {day}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto min-w-full">
      <div
        className="grid gap-1 p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
        style={{
          gridTemplateColumns: `90px 140px repeat(${data.days.length}, minmax(120px, 1fr))`,
          minWidth: "960px",
        }}
      >
        <div className="font-bold text-white text-xs uppercase flex items-center justify-center bg-white/10 rounded-lg p-2 border border-white/15 tracking-wide">
          Period
        </div>
        <div className="font-bold text-white text-xs uppercase flex items-center justify-center bg-white/10 rounded-lg p-2 border border-white/15 tracking-wide">
          Time
        </div>

        {data.days.map((day) => (
          <div
            key={`header-${day}`}
            className="font-bold text-white text-xs uppercase flex items-center justify-center bg-gradient-to-br from-white/15 to-white/5 rounded-lg p-2 border border-white/15 tracking-wide shadow-inner"
          >
            {day.slice(0, 3)}
          </div>
        ))}

        {data.periods.map((slot) => (
          <div key={`row-${slot.period}`} className="contents">
            <div className="font-semibold text-white text-xs flex items-center justify-center bg-white/8 rounded-lg p-2 border border-white/15">
              {slot.period}
            </div>
            <div className="font-semibold text-white text-xs flex items-center justify-center bg-white/8 rounded-lg p-2 border border-white/15">
              {slot.time || "--"}
            </div>

            {data.days.map((day) => {
              const subject = slot.subjects?.[day] || "Free Period";
              return (
                <div
                  key={`${slot.period}-${day}`}
                  className={`text-sm font-semibold rounded-lg p-3 border flex items-center justify-center text-center min-h-12 shadow-sm ${getSubjectColorClass(
                    subject,
                    subject === "Free Period"
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
});

const MobileSwipeableView = memo(function MobileSwipeableView({ data, currentDay, onDayChange, touchStart, touchEnd }) {
  const dayPeriods = data.dayPeriods[currentDay] || [];
  const dayIndex = data.days.indexOf(currentDay);

  return (
    <div
      className="touch-pan-y"
      onTouchStart={touchStart}
      onTouchEnd={touchEnd}
      onMouseDown={touchStart}
      onMouseUp={touchEnd}
    >
      <div className="flex items-center justify-between gap-3 mb-6">
        <button
          onClick={() => onDayChange(dayIndex - 1)}
          disabled={dayIndex === 0}
          className="p-2 rounded-lg bg-blue-600/50 hover:bg-blue-600 disabled:bg-slate-600/30 disabled:cursor-not-allowed transition text-white"
          aria-label="Previous day"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex-1 px-2">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white">{currentDay}</h3>
            <p className="text-blue-200 text-sm">
              {dayPeriods.length} periods
            </p>
          </div>
        </div>

        <button
          onClick={() => onDayChange(dayIndex + 1)}
          disabled={dayIndex === data.days.length - 1}
          className="p-2 rounded-lg bg-blue-600/50 hover:bg-blue-600 disabled:bg-slate-600/30 disabled:cursor-not-allowed transition text-white"
          aria-label="Next day"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {dayPeriods.length === 0 ? (
          <div className="text-center py-12 px-6 bg-slate-800/40 rounded-lg border border-slate-700">
            <p className="text-slate-300 text-sm">No periods scheduled for {currentDay}</p>
          </div>
        ) : (
          dayPeriods.map((period, idx) => (
            <div
              key={`${currentDay}-period-${idx}`}
              className={`rounded-lg p-4 border transition transform hover:scale-105 ${getSubjectColorClass(
                period.subject,
                period.isFree
              )}`}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold opacity-75">Period {period.period}</span>
                    <span className="text-xs font-semibold opacity-75">{period.time}</span>
                  </div>
                  <h4 className="text-lg font-bold truncate">{period.subject}</h4>
                  {period.teacher && (
                    <p className="text-xs opacity-90 mt-1 truncate">
                      👨‍🏫 {period.teacher}
                    </p>
                  )}
                </div>
                {period.isFree && (
                  <div className="text-xs font-semibold bg-white/20 px-2 py-1 rounded">
                    Free
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

const DayTabs = ({ days, activeDay, onDayChange }) => {
  const dayShortMap = {
    Monday: "Mon",
    Tuesday: "Tue",
    Wednesday: "Wed",
    Thursday: "Thu",
    Friday: "Fri",
    Saturday: "Sat",
    Sunday: "Sun",
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
      {days.map((day) => (
        <button
          key={day}
          onClick={() => onDayChange(days.indexOf(day))}
          className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition ${
            activeDay === day
              ? "bg-blue-600 text-white shadow-lg scale-105"
              : "bg-slate-700/60 text-slate-300 hover:bg-slate-600/80"
          }`}
        >
          {dayShortMap[day] || day}
        </button>
      ))}
    </div>
  );
};

export default function StudentTimetableFullPage() {
  const navigate = useNavigate();
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentInfo, setStudentInfo] = useState({ name: "Student", class: "-", section: "-" });
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [processedData, setProcessedData] = useState({ days: [], periods: [], dayPeriods: {} });
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const token = localStorage.getItem("studentToken");
        if (!token) {
          navigate("/student/login");
          return;
        }

        const storedInfo = localStorage.getItem("studentInfo");
        if (storedInfo) {
          setStudentInfo(JSON.parse(storedInfo));
        }

        const [tableRes, configRes] = await Promise.all([
          fetch(`${API_URL}/api/student/timetable`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/student/timetable/config`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!tableRes.ok) throw new Error("Failed to fetch timetable");
        const tableData = await tableRes.json();
        const configData = configRes.ok ? await configRes.json() : {};
        const configDays = configData?.config?.days || [];
        const configRows = configData?.config?.rows || [];

        const normalized = Array.isArray(tableData) ? tableData : [];
        const processed = processTimeTable(normalized, configDays, configRows);
        setTimetable(normalized);
        setProcessedData(processed);
        setCurrentDayIndex(0);
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

  const handleTouchStart = (e) => {
    touchStartRef.current = e.targetTouches?.[0]?.clientX || e.clientX;
  };

  const handleTouchEnd = (e) => {
    touchEndRef.current = e.changedTouches?.[0]?.clientX || e.clientX;
    handleSwipe();
  };

  const handleSwipe = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;

    const diff = touchStartRef.current - touchEndRef.current;
    const threshold = 50;

    if (diff > threshold && currentDayIndex < processedData.days.length - 1) {
      setCurrentDayIndex((prev) => prev + 1);
    }

    if (diff < -threshold && currentDayIndex > 0) {
      setCurrentDayIndex((prev) => prev - 1);
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  };

  const handleDayChange = (newIndex) => {
    if (newIndex >= 0 && newIndex < processedData.days.length) {
      setCurrentDayIndex(newIndex);
    }
  };

  const currentDay = processedData.days[currentDayIndex] || processedData.days[0] || "Monday";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-main)" }}>
        <ListSkeleton count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--bg-main)", color: "var(--text-primary)" }}>
        <div className="max-w-md text-center space-y-3">
          <p className="text-lg font-semibold">We couldn&apos;t load your timetable.</p>
          <p className="text-sm text-[var(--text-secondary)]">{String(error)}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 sm:p-6 relative overflow-hidden"
      style={{ background: "var(--bg-main)", color: "var(--text-primary)" }}
    >
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-2000" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-sm mb-4 flex items-center transition"
          >
            ← Back to Dashboard
          </button>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-5xl font-bold break-words text-[var(--text-primary)] mb-2">Your Weekly Schedule</h1>
              <p className="text-[var(--text-secondary)] text-base font-semibold break-words whitespace-normal">
                Class {studentInfo.class} • Section {studentInfo.section} • Complete class timetable 📅
              </p>
            </div>
            <div
              className="w-full md:w-auto max-w-full md:max-w-sm min-w-0 backdrop-blur-md border rounded-xl p-3"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
            >
              <p className="text-[var(--text-secondary)] text-sm break-words whitespace-normal">Student: <span className="font-bold text-[var(--text-primary)]">{studentInfo.name}</span></p>
            </div>
          </div>
        </div>

        {error ? (
          <div className="p-6 bg-red-500/20 border border-red-300/40 rounded-xl text-center">
            <p className="text-red-100 font-semibold">Error: {error}</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Go Back
            </button>
          </div>
        ) : (
          <>
            <div
              className="hidden lg:block backdrop-blur-xl border p-6 rounded-2xl shadow-xl overflow-hidden"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
            >
              <div className="mb-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Weekly Timetable</h2>
                <p className="text-[var(--text-secondary)] text-sm mt-1">Your complete schedule across all weekdays</p>
              </div>
              <TimetableGridRenderer data={processedData} />
            </div>

            <div className="lg:hidden">
              <div
                className="backdrop-blur-xl border p-6 rounded-2xl shadow-xl"
                style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
              >
                <DayTabs days={processedData.days} activeDay={currentDay} onDayChange={handleDayChange} />

                <MobileSwipeableView
                  data={processedData}
                  currentDay={currentDay}
                  onDayChange={handleDayChange}
                  touchStart={handleTouchStart}
                  touchEnd={handleTouchEnd}
                />
              </div>

              <div className="mt-4 text-center text-[var(--text-secondary)] text-xs">
                💡 Swipe left/right to change days
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
