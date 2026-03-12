import { useState, useMemo } from "react";

export default function AttendanceCalendar({ attendanceData = [], theme = "light" }) {
  const isDark = theme === "dark";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const attendanceMap = useMemo(() => {
    const map = {};
    attendanceData.forEach((record) => {
      if (record.date) {
        const dateStr = new Date(record.date).toISOString().split("T")[0];
        map[dateStr] = record.status?.toUpperCase() || "UNKNOWN";
      }
    });
    return map;
  }, [attendanceData]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({
        day: i,
        dateStr,
        status: attendanceMap[dateStr] || "NO_RECORD",
      });
    }

    return days;
  }, [currentDate, attendanceMap]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    setSelectedDate(null);
  };

  const handleDateClick = (dateObj) => {
    setSelectedDate(dateObj);
  };

  const getStatusColor = (status) => {
    if (isDark) {
      switch (status) {
        case "PRESENT":
          return "from-emerald-500/25 to-emerald-500/10 border-emerald-300/30 text-emerald-100";
        case "ABSENT":
          return "from-rose-500/25 to-rose-500/10 border-rose-300/30 text-rose-100";
        case "LEAVE":
          return "from-amber-500/25 to-amber-500/10 border-amber-300/30 text-amber-100";
        default:
          return "from-slate-900/70 to-slate-900/50 border-white/10 text-slate-300";
      }
    }
    switch (status) {
      case "PRESENT":
        return "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-900";
      case "ABSENT":
        return "from-rose-50 to-rose-100 border-rose-200 text-rose-900";
      case "LEAVE":
        return "from-amber-50 to-amber-100 border-amber-200 text-amber-900";
      default:
        return "from-slate-50 to-slate-100 border-slate-200 text-slate-500";
    }
  };

  const getStatusTextColor = (status) => {
    if (isDark) {
      switch (status) {
        case "PRESENT":
          return "text-emerald-200";
        case "ABSENT":
          return "text-rose-200";
        case "LEAVE":
          return "text-amber-200";
        default:
          return "text-slate-300";
      }
    }
    switch (status) {
      case "PRESENT":
        return "text-emerald-700";
      case "ABSENT":
        return "text-rose-700";
      case "LEAVE":
        return "text-amber-700";
      default:
        return "text-slate-500";
    }
  };

  const getStatusDot = (status) => {
    if (isDark) {
      switch (status) {
        case "PRESENT":
          return "bg-emerald-400";
        case "ABSENT":
          return "bg-rose-400";
        case "LEAVE":
          return "bg-amber-400";
        default:
          return "bg-slate-500";
      }
    }
    switch (status) {
      case "PRESENT":
        return "bg-emerald-500";
      case "ABSENT":
        return "bg-rose-500";
      case "LEAVE":
        return "bg-amber-500";
      default:
        return "bg-slate-300";
    }
  };

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const stats = useMemo(() => {
    const keys = Object.keys(attendanceMap);
    const present = keys.filter((k) => attendanceMap[k] === "PRESENT").length;
    const absent = keys.filter((k) => attendanceMap[k] === "ABSENT").length;
    const leave = keys.filter((k) => attendanceMap[k] === "LEAVE").length;
    const total = present + absent + leave;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

    return { present, absent, leave, total, percentage };
  }, [attendanceMap]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className={`space-y-6 ${isDark ? "text-slate-200" : ""}`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div
          className={`p-3 sm:p-4 rounded-2xl border shadow-sm hover:shadow-md transition ${
            isDark
              ? "bg-gradient-to-br from-slate-900/70 to-slate-900/50 border-white/10 text-slate-200"
              : "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200/50 text-slate-900"
          }`}
        >
          <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            Total
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-2 ${isDark ? "text-white" : "text-slate-900"}`}>
            {stats.total}
          </div>
        </div>
        <div
          className={`p-3 sm:p-4 rounded-2xl border shadow-sm hover:shadow-md transition ${
            isDark
              ? "bg-gradient-to-br from-emerald-500/25 to-emerald-500/10 border-emerald-300/30 text-emerald-100"
              : "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200/50 text-emerald-700"
          }`}
        >
          <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-emerald-100" : "text-emerald-700"}`}>
            Present
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-2 ${isDark ? "text-emerald-100" : "text-emerald-600"}`}>
            {stats.present}
          </div>
        </div>
        <div
          className={`p-3 sm:p-4 rounded-2xl border shadow-sm hover:shadow-md transition ${
            isDark
              ? "bg-gradient-to-br from-rose-500/25 to-rose-500/10 border-rose-300/30 text-rose-100"
              : "bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200/50 text-rose-700"
          }`}
        >
          <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-rose-100" : "text-rose-700"}`}>
            Absent
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-2 ${isDark ? "text-rose-100" : "text-rose-600"}`}>
            {stats.absent}
          </div>
        </div>
        <div
          className={`p-3 sm:p-4 rounded-2xl border shadow-sm hover:shadow-md transition ${
            isDark
              ? "bg-gradient-to-br from-cyan-500/25 to-blue-500/10 border-cyan-300/30 text-cyan-100"
              : "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200/50 text-blue-700"
          }`}
        >
          <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-cyan-100" : "text-blue-700"}`}>
            % Present
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-2 ${isDark ? "text-cyan-100" : "text-blue-600"}`}>
            {stats.percentage}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className={`lg:col-span-2 rounded-3xl border shadow-sm overflow-hidden ${
            isDark ? "bg-slate-900/60 border-white/10 backdrop-blur-xl" : "bg-white border-slate-200/50"
          }`}
        >
          <div
            className={`px-4 sm:px-6 py-4 border-b flex items-center justify-between ${
              isDark ? "border-white/10 bg-white/5" : "border-slate-100 bg-gradient-to-r from-slate-50 to-white"
            }`}
          >
            <button
              onClick={handlePrevMonth}
              className={`p-2 sm:p-3 rounded-xl transition font-semibold text-sm ${
                isDark ? "hover:bg-white/10 text-slate-200" : "hover:bg-slate-200/50 text-slate-700"
              }`}
              title="Previous month"
            >
              ←
            </button>
            <h2 className={`text-lg sm:text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              {monthName}
            </h2>
            <button
              onClick={handleNextMonth}
              className={`p-2 sm:p-3 rounded-xl transition font-semibold text-sm ${
                isDark ? "hover:bg-white/10 text-slate-200" : "hover:bg-slate-200/50 text-slate-700"
              }`}
              title="Next month"
            >
              →
            </button>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className={`text-center font-semibold text-xs sm:text-sm py-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((dayObj, idx) => {
                if (!dayObj) {
                  return <div key={`empty-${idx}`} className="aspect-square" />;
                }

                const isSelected = selectedDate?.dateStr === dayObj.dateStr;
                const hasData = dayObj.status !== "NO_RECORD";

                return (
                  <button
                    key={dayObj.dateStr}
                    onClick={() => handleDateClick(dayObj)}
                    className={`aspect-square rounded-2xl border-2 p-1 sm:p-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer hover:shadow-md ${
                      isSelected
                        ? `ring-2 ring-offset-1 ${isDark ? "ring-cyan-400 ring-offset-slate-900" : "ring-blue-400"} shadow-lg`
                        : ""
                    } ${hasData ? "border-current" : isDark ? "border-white/10" : "border-slate-200"} bg-gradient-to-br ${getStatusColor(dayObj.status)}`}
                  >
                    <div className="text-xs sm:text-lg font-bold">{dayObj.day}</div>
                    {hasData && (
                      <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mt-1 ${getStatusDot(dayObj.status)}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {selectedDate && (
            <div
              className={`rounded-3xl border shadow-sm overflow-hidden bg-gradient-to-br ${getStatusColor(
                selectedDate.status
              )} ${isDark ? "border-white/10" : "border-slate-200/50"}`}
            >
              <div className="px-4 sm:px-6 py-4 flex items-center gap-3 border-b border-current/10">
                <div className={`w-3 h-3 rounded-full ${getStatusDot(selectedDate.status)}`} />
                <h3 className="text-sm font-bold uppercase tracking-wide opacity-75">Attendance Details</h3>
              </div>
              <div className="px-4 sm:px-6 py-5 space-y-4">
                <div>
                  <div
                    className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                      isDark ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    Date
                  </div>
                  <div className={`text-sm sm:text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    {formatDate(selectedDate.dateStr)}
                  </div>
                </div>
                <div>
                  <div
                    className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                      isDark ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    Status
                  </div>
                  <div className={`text-base sm:text-lg font-bold ${getStatusTextColor(selectedDate.status)}`}>
                    {selectedDate.status === "NO_RECORD" ? "Not Marked" : selectedDate.status}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className={`w-full mt-4 py-2 rounded-xl transition font-medium text-sm ${
                    isDark ? "bg-white/10 hover:bg-white/20 text-slate-100" : "bg-white/30 hover:bg-white/50"
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          <div
            className={`rounded-3xl border shadow-sm p-4 sm:p-6 ${
              isDark ? "border-white/10 bg-slate-900/60 text-slate-200" : "border-slate-200/50 bg-white"
            }`}
          >
            <h3 className={`text-xs font-bold mb-4 uppercase tracking-wide ${isDark ? "text-white" : "text-slate-900"}`}>
              Legend
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>Present</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>Absent</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>Leave</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <span className={`text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"}`}>No Record</span>
              </div>
            </div>
          </div>

          <div
            className={`rounded-3xl border shadow-sm p-4 sm:p-6 ${
              isDark ? "border-white/10 bg-slate-900/60 text-slate-200" : "border-slate-200/50 bg-gradient-to-br from-slate-50 to-white"
            }`}
          >
            <h3 className={`text-xs font-bold mb-4 uppercase tracking-wide ${isDark ? "text-white" : "text-slate-900"}`}>
              Overview
            </h3>
            <div className="space-y-3 text-sm">
              <div className={`flex justify-between items-center py-2 ${isDark ? "border-b border-white/10" : "border-b border-slate-200"}`}>
                <span className={isDark ? "text-slate-200" : "text-slate-700"}>Classes Recorded</span>
                <span className={isDark ? "font-bold text-white" : "font-bold text-slate-900"}>{stats.total}</span>
              </div>
              <div className={`flex justify-between items-center py-2 ${isDark ? "border-b border-white/10" : "border-b border-slate-200"}`}>
                <span className={isDark ? "text-slate-200" : "text-slate-700"}>Present</span>
                <span className={isDark ? "font-bold text-emerald-200" : "font-bold text-emerald-600"}>{stats.present}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className={isDark ? "text-slate-200" : "text-slate-700"}>Absent</span>
                <span className={isDark ? "font-bold text-rose-200" : "font-bold text-rose-600"}>{stats.absent}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
