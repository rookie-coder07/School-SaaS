import { getTodayRange, getThisWeekRange, getThisMonthRange } from "../utils/dateFilterUtils";

export default function DateFilterBar({ value, onChange }) {
  const filter = value || { from: "", to: "" };

  const setPatch = (patch) => {
    onChange?.({ ...filter, ...patch });
  };

  return (
    <div className="date-filter-bar bg-white rounded-xl border border-slate-200 p-3 md:p-4 flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="text-xs text-slate-600 font-semibold">
          From Date
          <input
            type="date"
            value={filter.from || ""}
            onChange={(e) => setPatch({ from: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </label>
        <label className="text-xs text-slate-600 font-semibold">
          To Date
          <input
            type="date"
            value={filter.to || ""}
            onChange={(e) => setPatch({ to: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange?.(getTodayRange())} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold">
          Today
        </button>
        <button type="button" onClick={() => onChange?.(getThisWeekRange())} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold">
          This Week
        </button>
        <button type="button" onClick={() => onChange?.(getThisMonthRange())} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold">
          This Month
        </button>
        <button type="button" onClick={() => onChange?.({ from: "", to: "" })} className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold">
          Clear
        </button>
      </div>
    </div>
  );
}
