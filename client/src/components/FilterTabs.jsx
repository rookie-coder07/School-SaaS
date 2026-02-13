import { useEffect, useRef, useState } from "react";

/**
 * FilterTabs Component - Reusable filter pill tabs for homework/events/etc
 * 
 * Props:
 * - filters: Array of {id, label} objects
 * - activeFilter: Current active filter id
 * - onFilterChange: Callback function when filter changes
 * - variant: 'homework' | 'events' - determines color scheme
 */
export default function FilterTabs({ filters, activeFilter, onFilterChange, variant = "homework" }) {
  const scrollContainerRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Color schemes for different variants
  const colorSchemes = {
    homework: {
      all: "bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 hover:from-blue-200 hover:to-blue-100",
      today: "bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 hover:from-amber-200 hover:to-amber-100",
      week: "bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 hover:from-purple-200 hover:to-purple-100",
      overdue: "bg-gradient-to-r from-red-100 to-red-50 text-red-700 hover:from-red-200 hover:to-red-100",
      completed: "bg-gradient-to-r from-green-100 to-green-50 text-green-700 hover:from-green-200 hover:to-green-100",
    },
    events: {
      all: "bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 hover:from-slate-200 hover:to-slate-100",
      holidays: "bg-gradient-to-r from-rose-100 to-rose-50 text-rose-700 hover:from-rose-200 hover:to-rose-100",
      exams: "bg-gradient-to-r from-cyan-100 to-cyan-50 text-cyan-700 hover:from-cyan-200 hover:to-cyan-100",
      activities: "bg-gradient-to-r from-lime-100 to-lime-50 text-lime-700 hover:from-lime-200 hover:to-lime-100",
      upcoming: "bg-gradient-to-r from-indigo-100 to-indigo-50 text-indigo-700 hover:from-indigo-200 hover:to-indigo-100",
    },
  };

  const activeClasses = "ring-2 ring-offset-2 shadow-md font-semibold";
  const scheme = colorSchemes[variant] || colorSchemes.homework;

  // Get color for filter based on id
  const getFilterColor = (filterId) => {
    const colors = {
      "all": scheme.all || "bg-slate-100 text-slate-700",
      "today": scheme.today || "bg-amber-100 text-amber-700",
      "week": scheme.week || "bg-purple-100 text-purple-700",
      "overdue": scheme.overdue || "bg-red-100 text-red-700",
      "completed": scheme.completed || "bg-green-100 text-green-700",
      "holidays": scheme.holidays || "bg-rose-100 text-rose-700",
      "exams": scheme.exams || "bg-cyan-100 text-cyan-700",
      "activities": scheme.activities || "bg-lime-100 text-lime-700",
      "upcoming": scheme.upcoming || "bg-indigo-100 text-indigo-700",
    };
    return colors[filterId] || "bg-slate-100 text-slate-700";
  };

  // Check scroll position to show/hide arrows
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const hasScroll = container.scrollWidth > container.clientWidth;
    setShowLeftArrow(hasScroll && container.scrollLeft > 0);
    setShowRightArrow(hasScroll && container.scrollLeft < container.scrollWidth - container.clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [filters]);

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollAmount = 200;
    if (direction === "left") {
      container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
    setTimeout(checkScroll, 300);
  };

  return (
    <div className="relative w-full mb-6">
      {/* Left scroll arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 backdrop-blur-sm hover:bg-white shadow-md rounded-full p-2 transition-all hidden md:flex items-center justify-center"
          aria-label="Scroll left"
        >
          <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Filter tabs container */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex gap-2 overflow-x-auto scrollbar-hide px-4 md:px-0"
        style={{
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`px-4 py-2 rounded-full font-medium text-sm transition-all whitespace-nowrap flex-shrink-0 ${getFilterColor(
              filter.id
            )} ${activeFilter === filter.id ? activeClasses : "border border-slate-200/50"}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Right scroll arrow */}
      {showRightArrow && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 backdrop-blur-sm hover:bg-white shadow-md rounded-full p-2 transition-all hidden md:flex items-center justify-center"
          aria-label="Scroll right"
        >
          <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Custom scrollbar hide styles */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
