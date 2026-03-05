import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const CHART_COLORS = ["#38bdf8", "#6366f1", "#f59e0b", "#10b981", "#f43f5e", "#a855f7"];

const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const clampPercent = (value) => Math.max(0, Math.min(100, toNum(value)));

const tooltipStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  color: "#e2e8f0",
};

const normalizeStudentAnalytics = (payload) => {
  const student = payload?.student || {};
  const attendanceRaw = payload?.attendance || {};
  const marksRaw = payload?.marks || {};

  const attendance = {
    percentage: clampPercent(attendanceRaw?.percentage ?? payload?.attendancePercentage ?? payload?.attendance ?? 0),
    total: Math.max(0, toNum(attendanceRaw?.total)),
    present: Math.max(0, toNum(attendanceRaw?.present)),
    absent: Math.max(0, toNum(attendanceRaw?.absent)),
  };
  if (!attendance.total) attendance.total = attendance.present + attendance.absent;

  const subjectRows = []
    .concat(Array.isArray(payload?.subjects) ? payload.subjects : [])
    .concat(Array.isArray(marksRaw?.subjects) ? marksRaw.subjects : [])
    .concat(Array.isArray(payload?.subjectWiseMarks) ? payload.subjectWiseMarks : [])
    .map((row) => ({
      subject: String(row?.subject || row?.name || "").trim() || "Unknown Subject",
      average: clampPercent(row?.average ?? row?.avg ?? row?.marks ?? row?.score ?? row?.percentage ?? 0),
      highest: clampPercent(row?.highest ?? row?.best ?? row?.max ?? row?.marks ?? row?.average ?? 0),
      lowest: clampPercent(row?.lowest ?? row?.low ?? row?.min ?? row?.marks ?? row?.average ?? 0),
    }));

  const trend = []
    .concat(Array.isArray(marksRaw?.examTrends) ? marksRaw.examTrends : [])
    .concat(Array.isArray(payload?.examTrends) ? payload.examTrends : [])
    .map((row, idx) => ({
      label: String(row?.exam || row?.label || `Exam ${idx + 1}`),
      score: clampPercent(row?.average ?? row?.marks ?? row?.score ?? 0),
    }));

  const sorted = [...subjectRows].sort((a, b) => b.average - a.average);
  const topSubjects = sorted.slice(0, 5);
  const weakSubjects = sorted.filter((row) => row.average < 50).slice(0, 8);
  const overallAverage =
    subjectRows.length > 0
      ? clampPercent(subjectRows.reduce((sum, row) => sum + row.average, 0) / subjectRows.length)
      : clampPercent(marksRaw?.overallAverage ?? 0);

  const marksDistribution = [
    { label: "Excellent (80+)", count: subjectRows.filter((s) => s.average >= 80).length },
    { label: "Good (60-79)", count: subjectRows.filter((s) => s.average >= 60 && s.average < 80).length },
    { label: "Average (40-59)", count: subjectRows.filter((s) => s.average >= 40 && s.average < 60).length },
    { label: "Needs Help (<40)", count: subjectRows.filter((s) => s.average < 40).length },
  ];

  const suggestions = Array.isArray(payload?.suggestions) ? payload.suggestions.filter(Boolean) : [];
  const generated = [];
  if (attendance.percentage < 75) generated.push(`Attendance is ${attendance.percentage}%. Keep your daily attendance more consistent.`);
  if (weakSubjects.length > 0) generated.push(`Focus revision on ${weakSubjects.slice(0, 2).map((s) => s.subject).join(" and ")} this week.`);
  if (topSubjects.length > 0) generated.push(`Strong area: ${topSubjects[0].subject}. Use it to build confidence for harder subjects.`);

  return {
    student: {
      name: String(student?.name || payload?.studentName || "Student"),
      className: String(student?.class || payload?.className || "-"),
      section: String(student?.section || payload?.section || "-"),
      rollNo: student?.rollNo ?? payload?.rollNo ?? "-",
      email: String(student?.email || payload?.email || "-"),
    },
    attendance,
    rank: payload?.classRank ?? payload?.rank ?? payload?.myRank ?? payload?.rankInClass ?? null,
    overallAverage,
    subjectRows,
    topSubjects,
    weakSubjects,
    trend,
    marksDistribution,
    suggestions: [...suggestions, ...generated].slice(0, 6),
  };
};

export default function StudentAnalyticsDashboard({
  endpoint = `${API_URL}/api/student/analytics`,
  authToken,
  title = "Student Analytics Dashboard",
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  const token = authToken || localStorage.getItem("studentToken");

  useEffect(() => {
    const controller = new AbortController();

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to fetch student analytics");
        setPayload(data);
      } catch (err) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Failed to load student analytics");
        setPayload(null);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchAnalytics();
    else {
      setError("Student authentication token missing");
      setLoading(false);
    }

    return () => controller.abort();
  }, [endpoint, token]);

  const analytics = useMemo(() => normalizeStudentAnalytics(payload || {}), [payload]);
  const rankText = analytics.rank ? `#${analytics.rank}` : "N/A";

  return (
    <div className="space-y-6 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6 shadow-2xl">
      <div>
        <h2 className="text-xl font-black text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-300">
          {analytics.student.name} • Class {analytics.student.className}-{analytics.student.section} • Roll {analytics.student.rollNo}
        </p>
        <p className="text-xs text-slate-400 mt-1">{analytics.student.email}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="h-24 animate-pulse rounded-xl border border-slate-700 bg-slate-800/70" />
          <div className="h-24 animate-pulse rounded-xl border border-slate-700 bg-slate-800/70" />
          <div className="h-24 animate-pulse rounded-xl border border-slate-700 bg-slate-800/70" />
        </div>
      ) : null}

      {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

      {!loading && !error ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attendance</p>
              <p className="mt-1 text-2xl font-black text-cyan-300">{analytics.attendance.percentage}%</p>
              <p className="text-xs text-slate-300 mt-1">{analytics.attendance.present}/{analytics.attendance.total} present days</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Overall Average</p>
              <p className="mt-1 text-2xl font-black text-emerald-300">{Math.round(analytics.overallAverage)}%</p>
              <p className="text-xs text-slate-300 mt-1">Subject-wise average</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Class Rank</p>
              <p className="mt-1 text-2xl font-black text-indigo-300">{rankText}</p>
              <p className="text-xs text-slate-300 mt-1">Personal rank</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Subjects</p>
              <p className="mt-1 text-2xl font-black text-amber-300">{analytics.subjectRows.length}</p>
              <p className="text-xs text-slate-300 mt-1">Tracked subjects</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
              <h3 className="mb-3 text-sm font-bold text-slate-200">Top Performing Subjects</h3>
              <ul className="space-y-2">
                {analytics.topSubjects.length === 0 ? (
                  <li className="text-sm text-slate-400">No data</li>
                ) : (
                  analytics.topSubjects.map((row, idx) => (
                    <li key={`${row.subject}-${idx}`} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2">
                      <span className="text-sm font-semibold text-slate-100">{idx + 1}. {row.subject}</span>
                      <span className="text-sm font-bold text-emerald-300">{Math.round(row.average)}%</span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
              <h3 className="mb-3 text-sm font-bold text-slate-200">Subjects Needing Attention</h3>
              <ul className="space-y-2">
                {analytics.weakSubjects.length === 0 ? (
                  <li className="text-sm text-slate-400">No data</li>
                ) : (
                  analytics.weakSubjects.map((row, idx) => (
                    <li key={`${row.subject}-${idx}`} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2">
                      <span className="text-sm font-semibold text-slate-100">{row.subject}</span>
                      <span className="text-sm font-bold text-rose-300">{Math.round(row.average)}%</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
              <h3 className="mb-3 text-sm font-bold text-slate-200">Marks Distribution</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.marksDistribution} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={96} label>
                      {analytics.marksDistribution.map((_, idx) => (
                        <Cell key={`dist-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
              <h3 className="mb-3 text-sm font-bold text-slate-200">Performance Trend</h3>
              <div className="h-72">
                {analytics.trend.length === 0 ? (
                  <div className="grid h-full place-items-center text-sm text-slate-400">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="label" stroke="#94a3b8" />
                      <YAxis domain={[0, 100]} stroke="#94a3b8" />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${toNum(v)}%`, "Score"]} />
                      <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-200">Subject-wise Average Marks</h3>
            <div className="h-72">
              {analytics.subjectRows.length === 0 ? (
                <div className="grid h-full place-items-center text-sm text-slate-400">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.subjectRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="subject" stroke="#94a3b8" />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${toNum(v)}%`, "Average"]} />
                    <Bar dataKey="average" fill="#6366f1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-200">Suggestions & Next Steps</h3>
            {analytics.suggestions.length === 0 ? (
              <p className="text-sm text-slate-300">No suggestions right now.</p>
            ) : (
              <ul className="space-y-2">
                {analytics.suggestions.map((tip, idx) => (
                  <li key={`${idx}-${tip}`} className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100">
                    {tip}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
