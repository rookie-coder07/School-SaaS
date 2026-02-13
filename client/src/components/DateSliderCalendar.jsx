import { useState, useEffect } from "react";

/**
 * DateSliderCalendar Component - Interactive date range slider for filtering
 * Shows a mini calendar with selectable dates
 * 
 * Props:
 * - onDateRangeChange: Callback with {startDate, endDate}
 * - items: Array of objects with dueDate/eventDate fields
 * - highlightColor: Color for dates with items ('blue', 'red', 'indigo', etc)
 */
export default function DateSliderCalendar({ onDateRangeChange, items = [], highlightColor = "blue" }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStartDate, setSelectedStartDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);
  const [selectMode, setSelectMode] = useState("start"); // 'start' or 'end'

  // Get dates that have items (homework/events)
  const getDatesWithItems = () => {
    const datesSet = new Set();
    items.forEach((item) => {
      const date = item.dueDate || item.eventDate;
      if (date) {
        const d = new Date(date);
        datesSet.add(d.toISOString().split("T")[0]); // YYYY-MM-DD format
      }
    });
    return datesSet;
  };

  const datesWithItems = getDatesWithItems();

  // Get days in month
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 1 = Monday, etc)
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Format date as YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Handle date click
  const handleDateClick = (day) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

    if (selectMode === "start") {
      setSelectedStartDate(clickedDate);
      setSelectMode("end");
      setSelectedEndDate(null);
    } else {
      if (clickedDate < selectedStartDate) {
        // If end date is before start date, swap them
        setSelectedEndDate(selectedStartDate);
        setSelectedStartDate(clickedDate);
        setSelectMode("start");
      } else {
        setSelectedEndDate(clickedDate);
        setSelectMode("start");
        // Callback with selected range
        onDateRangeChange({
          startDate: selectedStartDate,
          endDate: clickedDate,
        });
      }
    }
  };

  // Check if date is in selected range
  const isInRange = (day) => {
    if (!selectedStartDate || !selectedEndDate) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date >= selectedStartDate && date <= selectedEndDate;
  };

  // Check if date is start or end
  const isStartOrEnd = (day) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = formatDate(date);
    const startStr = selectedStartDate ? formatDate(selectedStartDate) : null;
    const endStr = selectedEndDate ? formatDate(selectedEndDate) : null;
    return dateStr === startStr || dateStr === endStr;
  };

  // Color mapping
  const colorClasses = {
    blue: "bg-blue-100 text-blue-700",
    red: "bg-red-100 text-red-700",
    indigo: "bg-indigo-100 text-indigo-700",
    purple: "bg-purple-100 text-purple-700",
    green: "bg-green-100 text-green-700",
  };

  const highlightClass = colorClasses[highlightColor] || colorClasses.blue;

  // Month and year navigation
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = [];

  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add days of month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleReset = () => {
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    setSelectMode("start");
    onDateRangeChange(null);
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900 text-sm">Filter by Date Range</h3>
        {(selectedStartDate || selectedEndDate) && (
          <button
            onClick={handleReset}
            className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition"
          >
            Reset
          </button>
        )}
      </div>

      {/* Selected Range Display */}
      {selectedStartDate && selectedEndDate && (
        <div className="mb-4 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-100">
          <p className="text-xs text-slate-600">
            <span className="font-semibold text-slate-900">
              {formatDate(selectedStartDate)} → {formatDate(selectedEndDate)}
            </span>
          </p>
        </div>
      )}

      {selectMode === "end" && selectedStartDate && !selectedEndDate && (
        <div className="mb-4 p-2 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-700">
            Start: <span className="font-semibold">{formatDate(selectedStartDate)}</span> — Click end date
          </p>
        </div>
      )}

      {/* Calendar */}
      <div className="mb-4">
        {/* Month/Year Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
            aria-label="Previous month"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <p className="font-bold text-slate-900 text-sm">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </p>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
            aria-label="Next month"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="aspect-square" />;
            }

            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const dateStr = formatDate(date);
            const hasItems = datesWithItems.has(dateStr);
            const isSelected = isStartOrEnd(day);
            const inRange = isInRange(day);

            return (
              <button
                key={day}
                onClick={() => handleDateClick(day)}
                className={`
                  aspect-square rounded-lg text-xs font-medium transition
                  ${inRange ? "bg-indigo-100 text-indigo-900" : ""}
                  ${isSelected ? highlightClass + " ring-2 ring-offset-1 ring-indigo-500 font-bold" : ""}
                  ${!isSelected && !inRange ? (hasItems ? "bg-slate-100 text-slate-900 hover:bg-slate-200 cursor-pointer" : "text-slate-500 hover:bg-slate-50 cursor-default") : ""}
                  ${!hasItems && !isSelected && !inRange ? "opacity-50" : ""}
                `}
                disabled={!hasItems && !isSelected && !inRange}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <span>{day}</span>
                  {hasItems && !isSelected && !inRange && (
                    <span className="w-1 h-1 bg-blue-500 rounded-full mt-0.5"></span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-xs text-slate-600">
          {!selectedStartDate ? (
            <>Click a <span className="font-semibold">start date</span> with items</>
          ) : !selectedEndDate ? (
            <>Click an <span className="font-semibold">end date</span> to filter</>
          ) : (
            <>✓ Date range selected. Adjust or <button onClick={handleReset} className="font-semibold text-indigo-600 hover:text-indigo-700">reset</button> to change</>
          )}
        </p>
      </div>
    </div>
  );
}
