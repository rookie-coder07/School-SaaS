import { useState, useMemo } from "react";

export default function AttendanceCalendar({ attendanceData = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Build a map for fast lookup: "YYYY-MM-DD" -> status
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

  // Build calendar for current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of month and days in month
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Fill empty cells before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Fill days of month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(
        2,
        "0"
      )}`;
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

  // Calculate stats
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
      day: "numeric" 
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Summary - Minimal Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 rounded-2xl border border-slate-200/50 shadow-sm hover:shadow-md transition">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total</div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2">{stats.total}</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-3 sm:p-4 rounded-2xl border border-emerald-200/50 shadow-sm hover:shadow-md transition">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Present</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-2">{stats.present}</div>
        </div>
        <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-3 sm:p-4 rounded-2xl border border-rose-200/50 shadow-sm hover:shadow-md transition">
          <div className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Absent</div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 mt-2">{stats.absent}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-4 rounded-2xl border border-blue-200/50 shadow-sm hover:shadow-md transition">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide">% Present</div>
          <div className="text-xl sm:text-2xl font-black text-blue-600 mt-2">{stats.percentage}%</div>
        </div>
      </div>

      {/* Main Calendar Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/50 shadow-sm overflow-hidden">
          {/* Month Navigation */}
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
            <button
              onClick={handlePrevMonth}
              className="p-2 sm:p-3 rounded-xl hover:bg-slate-200/50 transition font-semibold text-slate-700 text-sm"
              title="Previous month"
            >
              ←
            </button>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{monthName}</h2>
            <button
              onClick={handleNextMonth}
              className="p-2 sm:p-3 rounded-xl hover:bg-slate-200/50 transition font-semibold text-slate-700 text-sm"
              title="Next month"
            >
              →
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="p-4 sm:p-6">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="text-center font-semibold text-xs sm:text-sm text-slate-500 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map((dayObj, idx) => {
                if (!dayObj) {
                  return (
                    <div key={`empty-${idx}`} className="aspect-square" />
                  );
                }

                const isSelected = selectedDate?.dateStr === dayObj.dateStr;
                const hasData = dayObj.status !== "NO_RECORD";

                return (
                  <button
                    key={dayObj.dateStr}
                    onClick={() => handleDateClick(dayObj)}
                    className={`aspect-square rounded-2xl border-2 p-1 sm:p-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer hover:shadow-md ${
                      isSelected 
                        ? "ring-2 ring-offset-1 ring-blue-400 shadow-lg" 
                        : ""
                    } ${
                      hasData ? "border-current" : "border-slate-200"
                    } bg-gradient-to-br ${getStatusColor(dayObj.status)}`}
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

        {/* Detail Panel / Legend */}
        <div className="space-y-4">
          {/* Detail View */}
          {selectedDate && (
            <div className={`rounded-3xl border border-slate-200/50 shadow-sm overflow-hidden bg-gradient-to-br ${getStatusColor(selectedDate.status)}`}>
              <div className="px-4 sm:px-6 py-4 flex items-center gap-3 border-b border-current/10">
                <div className={`w-3 h-3 rounded-full ${getStatusDot(selectedDate.status)}`} />
                <h3 className="text-sm font-bold uppercase tracking-wide opacity-75">Attendance Details</h3>
              </div>
              <div className="px-4 sm:px-6 py-5 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Date</div>
                  <div className="text-sm sm:text-base font-bold text-slate-900">
                    {formatDate(selectedDate.dateStr)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Status</div>
                  <div className={`text-base sm:text-lg font-bold ${getStatusTextColor(selectedDate.status)}`}>
                    {selectedDate.status === "NO_RECORD" ? "Not Marked" : selectedDate.status}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="w-full mt-4 py-2 bg-white/30 hover:bg-white/50 rounded-xl transition font-medium text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="rounded-3xl border border-slate-200/50 shadow-sm p-4 sm:p-6 bg-white">
            <h3 className="text-xs font-bold text-slate-900 mb-4 uppercase tracking-wide">Legend</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-slate-700 font-medium">Present</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-sm text-slate-700 font-medium">Absent</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm text-slate-700 font-medium">Leave</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <span className="text-sm text-slate-700 font-medium">No Record</span>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="rounded-3xl border border-slate-200/50 shadow-sm p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-white">
            <h3 className="text-xs font-bold text-slate-900 mb-4 uppercase tracking-wide">Overview</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-700">Classes Recorded</span>
                <span className="font-bold text-slate-900">{stats.total}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200">
                <span className="text-slate-700">Present</span>
                <span className="font-bold text-emerald-600">{stats.present}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-700">Absent</span>
                <span className="font-bold text-rose-600">{stats.absent}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
