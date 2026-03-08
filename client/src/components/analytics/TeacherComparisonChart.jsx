import { memo, useMemo } from "react";

const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, toNum(value)));

function TeacherComparisonChart({
  data = [],
  labelKey = "teacherName",
  valueAKey = "valueA",
  valueALabel = "Series A",
  valueAClass = "bg-gradient-to-r from-cyan-500 to-blue-500",
  valueBKey = "",
  valueBLabel = "",
  valueBClass = "bg-gradient-to-r from-violet-500 to-fuchsia-500",
  maxRows = 10,
}) {
  const rows = useMemo(() => {
    const base = Array.isArray(data) ? data : [];
    return base.slice(0, Math.max(1, toNum(maxRows)));
  }, [data, maxRows]);

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="text-sm text-slate-300">No chart data available.</p>
      ) : (
        rows.map((row, idx) => {
          const label = String(row?.[labelKey] || `Teacher ${idx + 1}`);
          const aValue = clamp(row?.[valueAKey]);
          const bValue = valueBKey ? clamp(row?.[valueBKey]) : null;

          return (
            <div key={`${label}-${idx}`} className="rounded-lg border border-white/15 bg-slate-900/45 px-3 py-3">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                <span className="truncate pr-3 font-semibold text-slate-100">{label}</span>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-300">
                    <span>{valueALabel}</span>
                    <span className="font-bold text-slate-100">{aValue.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800/70">
                    <div className={`h-2 ${valueAClass}`} style={{ width: `${aValue}%` }} />
                  </div>
                </div>

                {bValue !== null ? (
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[11px] text-slate-300">
                      <span>{valueBLabel}</span>
                      <span className="font-bold text-slate-100">{bValue.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800/70">
                      <div className={`h-2 ${valueBClass}`} style={{ width: `${bValue}%` }} />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default memo(TeacherComparisonChart);

