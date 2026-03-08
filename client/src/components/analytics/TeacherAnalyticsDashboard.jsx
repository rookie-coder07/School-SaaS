import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import AttendanceTrendChartStatic from "./AttendanceTrendChart";
import MarksDistributionChartStatic from "./MarksDistributionChart";
import SubjectPerformanceChartStatic from "./SubjectPerformanceChart";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const IS_DEV = Boolean(import.meta.env.DEV);

const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toText = (value, fallback = "-") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const getInitials = (name) =>
  toText(name, "Student")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const cardClass = "rounded-2xl border border-white/15 bg-white/10 p-4 shadow-[0_15px_35px_rgba(2,6,23,0.35)] backdrop-blur-xl";
const cardTint = {
  cyan: "bg-gradient-to-br from-cyan-500/20 via-sky-500/10 to-slate-900/45 border-cyan-300/30",
  violet: "bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-slate-900/45 border-violet-300/30",
  emerald: "bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-slate-900/45 border-emerald-300/30",
  rose: "bg-gradient-to-br from-rose-500/20 via-orange-500/10 to-slate-900/45 border-rose-300/30",
  amber: "bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-slate-900/45 border-amber-300/30",
};

const MiniFallbackChart = ({ data = [], valueKey = "value", labelKey = "label", suffix = "" }) => (
  <div className="space-y-2">
    {(Array.isArray(data) ? data : []).slice(0, 7).map((row, idx) => (
      <div key={`${idx}-${row?.[labelKey] || "row"}`} className="rounded-lg border border-white/15 bg-slate-900/45 px-3 py-2">
        <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
          <span>{toText(row?.[labelKey], `Item ${idx + 1}`)}</span>
          <span className="font-bold text-slate-100">
            {toNum(row?.[valueKey])}
            {suffix}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800/70">
          <div className="h-2 bg-cyan-400" style={{ width: `${Math.max(0, Math.min(100, toNum(row?.[valueKey])))}%` }} />
        </div>
      </div>
    ))}
  </div>
);

const lazyWithFallback = (importer, FallbackComponent) =>
  lazy(() =>
    importer().catch((error) => {
      console.warn("Lazy chart import failed. Falling back to lightweight renderer.", error);
      return { default: FallbackComponent };
    })
  );

const AttendanceTrendChart = IS_DEV
  ? AttendanceTrendChartStatic
  : lazyWithFallback(() => import("./AttendanceTrendChart"), (props) => (
      <MiniFallbackChart data={props?.data} valueKey="attendance" labelKey="label" suffix="%" />
    ));
const MarksDistributionChart = IS_DEV
  ? MarksDistributionChartStatic
  : lazyWithFallback(() => import("./MarksDistributionChart"), (props) => (
      <MiniFallbackChart data={props?.data} valueKey="count" labelKey="label" />
    ));
const SubjectPerformanceChart = IS_DEV
  ? SubjectPerformanceChartStatic
  : lazyWithFallback(() => import("./SubjectPerformanceChart"), (props) => (
      <MiniFallbackChart data={props?.data} valueKey="averageMarks" labelKey="subject" suffix="%" />
    ));

function ChartSkeleton() {
  return <div className="h-56 w-full animate-pulse rounded-xl border border-white/15 bg-slate-900/50" />;
}

function DeferredRender({ children }) {
  const holderRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return undefined;
    const node = holderRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
        }
      },
      { rootMargin: "120px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return <div ref={holderRef}>{visible ? children : <ChartSkeleton />}</div>;
}
export default function TeacherAnalyticsDashboard({ refreshKey = 0, onGoToStudents }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [filters, setFilters] = useState({
    exam: "all",
    subject: "all",
    timeRange: "week",
  });

  const token = localStorage.getItem("teacherToken");

  useEffect(() => {
    const controller = new AbortController();

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();
        params.set("exam", filters.exam || "all");
        params.set("subject", filters.subject || "all");
        params.set("timeRange", filters.timeRange || "week");

        const res = await fetch(`${API_URL}/api/teacher/class-analytics?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.error || "Failed to fetch class analytics");
        setAnalytics(payload || {});
      } catch (err) {
        if (err?.name === "AbortError") return;
        setError(err?.message || "Failed to load class analytics");
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchAnalytics();
    else {
      setError("Teacher authentication token missing");
      setLoading(false);
    }

    return () => controller.abort();
  }, [token, refreshKey, filters.exam, filters.subject, filters.timeRange]);

  const data = useMemo(() => {
    const overview = analytics?.overview || {};
    const options = analytics?.options || {};

    return {
      className: toText(analytics?.class, "-"),
      section: toText(analytics?.section, "-"),
      overview: {
        totalStudents: toNum(overview?.totalStudents),
        averageClassScore: toNum(overview?.averageClassScore),
        attendancePercent: toNum(overview?.attendancePercent),
        needsAttention: toNum(overview?.needsAttention),
      },
      attendanceTrend: Array.isArray(analytics?.attendanceTrend) ? analytics.attendanceTrend : [],
      marksDistribution: Array.isArray(analytics?.marksDistribution) ? analytics.marksDistribution : [],
      subjectPerformance: Array.isArray(analytics?.subjectPerformance) ? analytics.subjectPerformance : [],
      weakStudents: Array.isArray(analytics?.weakStudents) ? analytics.weakStudents.slice(0, 5) : [],
      topStudents: Array.isArray(analytics?.topStudents) ? analytics.topStudents.slice(0, 3) : [],
      quickInsights: Array.isArray(analytics?.quickInsights) ? analytics.quickInsights : [],
      classHealth: {
        score: toNum(analytics?.classHealth?.score),
        status: toText(analytics?.classHealth?.status, "Needs Support"),
      },
      options: {
        exams: Array.isArray(options?.exams) ? options.exams : [],
        subjects: Array.isArray(options?.subjects) ? options.subjects : [],
        timeRanges: Array.isArray(options?.timeRanges) ? options.timeRanges : ["week", "month", "term"],
      },
    };
  }, [analytics]);

  const healthColor = data.classHealth.score >= 80 ? "bg-emerald-500" : data.classHealth.score >= 65 ? "bg-amber-500" : "bg-rose-500";
  const weakestSubject = [...data.subjectPerformance].sort((a, b) => toNum(a.averageMarks) - toNum(b.averageMarks))[0] || null;
  const strongestSubject = [...data.subjectPerformance].sort((a, b) => toNum(b.averageMarks) - toNum(a.averageMarks))[0] || null;
  const attendanceRiskStudents = data.weakStudents.filter((row) => toNum(row.attendance) < 75).slice(0, 5);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#0b1734] via-[#112247] to-[#0f1f3f] p-4 md:p-6 text-slate-100">
      <div className="pointer-events-none absolute -top-20 -left-20 h-60 w-60 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-7xl space-y-4 md:space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Class Analytics</h2>
            <p className="text-sm text-blue-100/90">Class {data.className} • Section {data.section}</p>
          </div>
          {typeof onGoToStudents === "function" ? (
            <button
              onClick={onGoToStudents}
              className="rounded-xl border border-sky-300/40 bg-sky-500/25 px-4 py-2 text-sm font-bold text-sky-100 transition hover:bg-sky-500/40"
            >
              Open Students List
            </button>
          ) : null}
        </div>

        <div className={cardClass}>
          <p className="mb-3 text-sm font-bold text-cyan-100">Filters</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-xs text-slate-200">
              Exam
              <select
                value={filters.exam}
                onChange={(e) => setFilters((prev) => ({ ...prev, exam: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:outline-none"
              >
                <option value="all">All</option>
                {data.options.exams.map((exam) => (
                  <option key={exam} value={exam}>{exam}</option>
                ))}
              </select>
            </label>

            <label className="text-xs text-slate-200">
              Subject
              <select
                value={filters.subject}
                onChange={(e) => setFilters((prev) => ({ ...prev, subject: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:outline-none"
              >
                <option value="all">All</option>
                {data.options.subjects.map((subject) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </label>

            <label className="text-xs text-slate-200">
              Time Range
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters((prev) => ({ ...prev, timeRange: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 focus:outline-none"
              >
                {data.options.timeRanges.map((range) => (
                  <option key={range} value={range}>{range[0].toUpperCase() + range.slice(1)}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error ? <div className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, idx) => <div key={idx} className="h-24 animate-pulse rounded-xl border border-white/15 bg-white/10" />)}
            </div>
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : null}

        {!loading && !error ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className={`${cardClass} ${cardTint.cyan}`}><p className="text-xs text-cyan-100/90">Total Students</p><p className="mt-1 text-2xl font-black text-white">{data.overview.totalStudents}</p></div>
              <div className={`${cardClass} ${cardTint.violet}`}><p className="text-xs text-violet-100/90">Average Class Score</p><p className="mt-1 text-2xl font-black text-violet-100">{data.overview.averageClassScore}%</p></div>
              <div className={`${cardClass} ${cardTint.emerald}`}><p className="text-xs text-emerald-100/90">Attendance %</p><p className="mt-1 text-2xl font-black text-emerald-100">{data.overview.attendancePercent}%</p></div>
              <div className={`${cardClass} ${cardTint.rose}`}><p className="text-xs text-rose-100/90">Students Needing Attention</p><p className="mt-1 text-2xl font-black text-rose-100">{data.overview.needsAttention}</p></div>
            </div>

            <div className={`${cardClass} ${cardTint.cyan}`}>
              <h3 className="mb-3 text-sm font-bold text-blue-100">Attendance Trend</h3>
              <p className="mb-3 text-xs text-slate-300">Last 7 Days Attendance %</p>
              <DeferredRender>
                <Suspense fallback={<ChartSkeleton />}>
                  <AttendanceTrendChart data={data.attendanceTrend} />
                </Suspense>
              </DeferredRender>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className={`${cardClass} ${cardTint.violet}`}>
                <h3 className="mb-3 text-sm font-bold text-violet-100">Marks Distribution</h3>
                <p className="mb-3 text-xs text-slate-300">Students per marks range</p>
                <DeferredRender>
                  <Suspense fallback={<ChartSkeleton />}>
                    <MarksDistributionChart data={data.marksDistribution} />
                  </Suspense>
                </DeferredRender>
              </div>

              <div className={`${cardClass} ${cardTint.emerald}`}>
                <h3 className="mb-3 text-sm font-bold text-emerald-100">Subject Performance</h3>
                <p className="mb-3 text-xs text-slate-300">Average score per subject</p>
                <DeferredRender>
                  <Suspense fallback={<ChartSkeleton />}>
                    <SubjectPerformanceChart data={data.subjectPerformance} />
                  </Suspense>
                </DeferredRender>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className={`${cardClass} ${cardTint.rose}`}>
                <h3 className="mb-3 text-sm font-bold text-rose-100">Students Needing Attention</h3>
                <ul className="space-y-2">
                  {data.weakStudents.length === 0 ? (
                    <li className="text-sm text-slate-300">No students flagged.</li>
                  ) : (
                    data.weakStudents.map((row, idx) => (
                      <li key={`${row.studentId || idx}`} className="rounded-lg border border-white/15 bg-slate-900/45 px-3 py-2 text-sm">
                        <div className="flex items-start gap-3">
                          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rose-300/40 bg-rose-500/20 text-xs font-black text-rose-100">
                            {getInitials(row.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-100">⚠ {toText(row.name, "Student")}</p>
                            <p className="text-xs text-slate-300">{toText(row.issue, "Needs support")}</p>
                          </div>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className={`${cardClass} ${cardTint.emerald}`}>
                <h3 className="mb-3 text-sm font-bold text-emerald-100">Top Performers</h3>
                <ul className="space-y-2">
                  {data.topStudents.length === 0 ? (
                    <li className="text-sm text-slate-300">No data available.</li>
                  ) : (
                    data.topStudents.map((row, idx) => (
                      <li key={`${row.studentId || idx}`} className="flex items-center justify-between rounded-lg border border-white/15 bg-slate-900/45 px-3 py-2 text-sm">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-500/20 text-xs font-black text-emerald-100">
                            {getInitials(row.name)}
                          </div>
                          <span className="truncate font-semibold text-slate-100">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"} {toText(row.name, "Student")}
                          </span>
                        </div>
                        <span className="font-black text-emerald-200">{toNum(row.averageMarks)}%</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className={`${cardClass} ${cardTint.cyan}`}>
                <h3 className="mb-3 text-sm font-bold text-cyan-100">Quick Insights</h3>
                <ul className="space-y-2 text-sm text-slate-100">
                  {data.quickInsights.length === 0 ? (
                    <li className="text-slate-300">No insights generated yet.</li>
                  ) : (
                    data.quickInsights.map((insight, idx) => (
                      <li key={`${idx}-${insight}`} className="rounded-lg border border-white/15 bg-slate-900/45 px-3 py-2">📊 {insight}</li>
                    ))
                  )}
                </ul>
              </div>

              <div className={`${cardClass} ${cardTint.amber}`}>
                <h3 className="mb-3 text-sm font-bold text-amber-100">Class Health Meter</h3>
                <p className="text-xs text-slate-300">Class Health: {data.classHealth.score}%</p>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-800/70">
                  <div className={`h-3 ${healthColor}`} style={{ width: `${Math.max(0, Math.min(100, data.classHealth.score))}%` }} />
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-100">Status: {data.classHealth.status}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className={`${cardClass} ${cardTint.rose}`}>
                <h3 className="mb-2 text-sm font-bold text-rose-100">Weakest Subject Detector</h3>
                {weakestSubject ? (
                  <>
                    <p className="text-sm font-semibold text-slate-100">Weakest Subject: {toText(weakestSubject.subject, "N/A")}</p>
                    <p className="text-xs text-slate-300">Average Score: {toNum(weakestSubject.averageMarks)}%</p>
                    <p className="mt-2 text-xs text-slate-200">Students are struggling in {toText(weakestSubject.subject, "this subject")}. Consider additional revision sessions.</p>
                  </>
                ) : (
                  <p className="text-xs text-slate-300">No subject data available.</p>
                )}
              </div>

              <div className={`${cardClass} ${cardTint.emerald}`}>
                <h3 className="mb-2 text-sm font-bold text-emerald-100">Strongest Subject Detector</h3>
                {strongestSubject ? (
                  <>
                    <p className="text-sm font-semibold text-slate-100">Strongest Subject: {toText(strongestSubject.subject, "N/A")}</p>
                    <p className="text-xs text-slate-300">Average Score: {toNum(strongestSubject.averageMarks)}%</p>
                    <p className="mt-2 text-xs text-slate-200">{toText(strongestSubject.subject, "This subject")} performance is strong across the class.</p>
                  </>
                ) : (
                  <p className="text-xs text-slate-300">No subject data available.</p>
                )}
              </div>

              <div className={`${cardClass} ${cardTint.amber}`}>
                <h3 className="mb-2 text-sm font-bold text-amber-100">Attendance Risk Predictor</h3>
                {attendanceRiskStudents.length === 0 ? (
                  <p className="text-xs text-slate-300">No immediate attendance risk detected.</p>
                ) : (
                  <>
                    <ul className="space-y-1 text-xs text-slate-200">
                      {attendanceRiskStudents.map((row, idx) => (
                        <li key={`${row.studentId || idx}`}>⚠ {toText(row.name, "Student")} - {toNum(row.attendance)}% attendance</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-slate-300">These students may fall below the 75% attendance requirement.</p>
                  </>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}







