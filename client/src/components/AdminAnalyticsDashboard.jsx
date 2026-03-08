import React, { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import TeacherComparisonChartStatic from "./analytics/TeacherComparisonChart";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const PAGE_SIZE = 10;
const ATTENTION_PAGE_SIZE = 4;
const IS_DEV = Boolean(import.meta.env.DEV);
const TeacherComparisonChart = IS_DEV
  ? TeacherComparisonChartStatic
  : lazy(() =>
      import("./analytics/TeacherComparisonChart").catch(() => ({
        default: TeacherComparisonChartStatic,
      }))
    );

const GlassCard = memo(function GlassCard({ children, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-white/15 bg-slate-900/45 backdrop-blur-xl shadow-[0_14px_34px_rgba(2,6,23,0.38)] ${className}`}
    >
      {children}
    </div>
  );
});

const CLASS_CARD_THEMES = [
  {
    shell: "from-indigo-500/25 via-violet-500/20 to-slate-900/60 border-indigo-300/40",
    barA: "bg-gradient-to-r from-emerald-500 to-teal-500",
    barM: "bg-gradient-to-r from-blue-500 to-indigo-500",
    badge: "bg-indigo-500/20 text-indigo-100 border-indigo-300/40",
  },
  {
    shell: "from-cyan-500/25 via-sky-500/20 to-slate-900/60 border-cyan-300/40",
    barA: "bg-gradient-to-r from-emerald-500 to-lime-500",
    barM: "bg-gradient-to-r from-sky-500 to-blue-500",
    badge: "bg-cyan-500/20 text-cyan-100 border-cyan-300/40",
  },
  {
    shell: "from-pink-500/25 via-rose-500/20 to-slate-900/60 border-pink-300/40",
    barA: "bg-gradient-to-r from-emerald-500 to-green-500",
    barM: "bg-gradient-to-r from-pink-500 to-rose-500",
    badge: "bg-pink-500/20 text-pink-100 border-pink-300/40",
  },
  {
    shell: "from-amber-500/25 via-orange-500/20 to-slate-900/60 border-amber-300/40",
    barA: "bg-gradient-to-r from-emerald-500 to-teal-500",
    barM: "bg-gradient-to-r from-amber-500 to-orange-500",
    badge: "bg-amber-500/20 text-amber-100 border-amber-300/40",
  },
];

const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const clampPercent = (value) => {
  const n = toNum(value);
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
};

const buildTeacherMap = (teachers = []) => {
  const map = new Map();
  for (const t of teachers) {
    const className = String(t?.class || t?.className || "").trim();
    const sectionName = String(t?.section || t?.sectionName || "").trim();
    const teacherName = String(t?.name || t?.teacherName || t?.fullName || "").trim();
    if (!className || !teacherName) continue;
    map.set(`${className}::${sectionName}`, teacherName);
  }
  return map;
};

const SkeletonCard = memo(function SkeletonCard() {
  return (
    <GlassCard className="rounded-[26px] p-5 animate-pulse border-white/15 bg-slate-900/45 shadow-[0_14px_34px_rgba(2,6,23,0.38)]">
      <div className="h-4 w-1/2 rounded bg-slate-600/60" />
      <div className="mt-5 h-3 w-full rounded bg-slate-700/60" />
      <div className="mt-2 h-3 w-5/6 rounded bg-slate-700/50" />
    </GlassCard>
  );
});

const MetricBar = memo(function MetricBar({ label, value, barClass }) {
  const percent = clampPercent(value);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="font-semibold text-slate-100">{percent.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-700/70">
        <div className={`h-2 rounded-full ${barClass}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
});

const OverviewCard = memo(function OverviewCard({ icon, title, value, subtitle, valueTone = "text-white" }) {
  return (
    <GlassCard className="rounded-[26px] p-5 border-white/15 bg-slate-900/45 shadow-[0_14px_34px_rgba(2,6,23,0.38)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-300">{title}</p>
        <span className="text-xl leading-none">{icon}</span>
      </div>
      <p className={`mt-3 text-4xl font-black tracking-tight ${valueTone}`}>{value}</p>
      <p className="mt-2 text-xs text-slate-300">{subtitle}</p>
    </GlassCard>
  );
});

const ClassAnalyticsCard = memo(function ClassAnalyticsCard({ row, index }) {
  const theme = CLASS_CARD_THEMES[index % CLASS_CARD_THEMES.length];
  return (
    <GlassCard className={`rounded-[26px] p-5 border bg-gradient-to-br ${theme.shell} transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(8,47,73,0.5)]`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold tracking-tight text-slate-100">
            Class {row.className || "-"}-{row.sectionName || "-"}
          </p>
          <p className="mt-2 text-sm text-slate-300">Teacher: {row.classTeacher || "Not assigned"}</p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${theme.badge}`}>
          {toNum(row.totalStudents)} students
        </span>
      </div>
      <div className="mt-5 space-y-4">
        <MetricBar label="Attendance" value={row.avgAttendancePercent} barClass={theme.barA} />
        <MetricBar label="Average Marks" value={row.avgMarksPercent} barClass={theme.barM} />
      </div>
    </GlassCard>
  );
});

const AttentionCard = memo(function AttentionCard({ item }) {
  return (
    <GlassCard className="rounded-[26px] p-5 border-rose-300/30 bg-gradient-to-br from-rose-500/20 via-purple-500/20 to-slate-900/50 shadow-[0_14px_34px_rgba(2,6,23,0.38)]">
      <p className="text-lg font-semibold tracking-tight text-rose-100">
        Class {item.className || "-"}-{item.sectionName || "-"}
      </p>
      <p className="mt-2 text-sm text-rose-100/90 leading-relaxed">{item.message}</p>
    </GlassCard>
  );
});

const AdminAnalyticsContent = memo(function AdminAnalyticsContent({ token, teachers = [] }) {
  const [activeSection, setActiveSection] = useState("class");
  const [overview, setOverview] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    attendanceStats: { present: 0, absent: 0, totalRecords: 0, overallPercent: 0 },
    marksStats: { totalEntries: 0, overallAverage: 0 },
  });
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState("");
  const [teacherError, setTeacherError] = useState("");
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherAnalytics, setTeacherAnalytics] = useState(null);
  const [page, setPage] = useState(1);
  const [attentionPage, setAttentionPage] = useState(1);
  const [stages, setStages] = useState({
    overview: false,
    classes: false,
    attention: false,
  });
  const stageTimersRef = useRef([]);

  const teacherMap = useMemo(() => buildTeacherMap(teachers), [teachers]);

  const clearStageTimers = useCallback(() => {
    for (const timerId of stageTimersRef.current) clearTimeout(timerId);
    stageTimersRef.current = [];
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    clearStageTimers();

    const load = async () => {
      if (!token) {
        if (mounted) {
          setError("Missing admin session.");
          setStages({ overview: false, classes: false, attention: false });
        }
        return;
      }

      setError("");
      setPage(1);
      setAttentionPage(1);
      setStages({ overview: false, classes: false, attention: false });

      try {
        const res = await fetch(`${API_URL}/api/admin/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Analytics request failed (${res.status})`);
        const payload = await res.json().catch(() => ({}));
        if (!mounted || controller.signal.aborted) return;

        setOverview({
          totalStudents: toNum(payload?.totalStudents),
          totalTeachers: toNum(payload?.totalTeachers),
          attendanceStats: {
            present: toNum(payload?.attendanceStats?.present),
            absent: toNum(payload?.attendanceStats?.absent),
            totalRecords: toNum(payload?.attendanceStats?.totalRecords),
            overallPercent: clampPercent(payload?.attendanceStats?.overallPercent),
          },
          marksStats: {
            totalEntries: toNum(payload?.marksStats?.totalEntries),
            overallAverage: clampPercent(payload?.marksStats?.overallAverage),
          },
        });

        const rows = Array.isArray(payload?.classes) ? payload.classes : [];
        const enriched = rows.map((row) => {
          const className = String(row?.className || "").trim();
          const sectionName = String(row?.sectionName || "").trim();
          const teacherName = teacherMap.get(`${className}::${sectionName}`) || "Not assigned";
          return {
            ...row,
            className,
            sectionName,
            classTeacher: teacherName,
          };
        });

        setStages((prev) => ({ ...prev, overview: true }));
        stageTimersRef.current.push(
          setTimeout(() => {
            if (!mounted || controller.signal.aborted) return;
            setClasses(enriched);
            setStages((prev) => ({ ...prev, classes: true }));
          }, 130)
        );
        stageTimersRef.current.push(
          setTimeout(() => {
            if (!mounted || controller.signal.aborted) return;
            setStages((prev) => ({ ...prev, attention: true }));
          }, 260)
        );
      } catch (err) {
        if (controller.signal.aborted) return;
        if (mounted) {
          setError(err?.message || "Failed to load analytics.");
          setClasses([]);
          setStages({ overview: true, classes: true, attention: true });
        }
      }
    };

    load();
    return () => {
      mounted = false;
      clearStageTimers();
      controller.abort();
    };
  }, [token, teacherMap, clearStageTimers]);

  useEffect(() => {
    if (activeSection !== "teacher") return;
    if (!token) {
      setTeacherError("Missing admin session.");
      setTeacherAnalytics(null);
      setTeacherLoading(false);
      return;
    }

    const controller = new AbortController();
    let mounted = true;

    const loadTeacherAnalytics = async () => {
      try {
        setTeacherLoading(true);
        setTeacherError("");
        const res = await fetch(`${API_URL}/api/admin/analytics/teachers`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Teacher analytics request failed (${res.status})`);
        const payload = await res.json().catch(() => ({}));
        if (!mounted || controller.signal.aborted) return;
        setTeacherAnalytics(payload || {});
      } catch (err) {
        if (controller.signal.aborted) return;
        if (!mounted) return;
        setTeacherError(err?.message || "Failed to load teacher analytics.");
        setTeacherAnalytics(null);
      } finally {
        if (mounted) setTeacherLoading(false);
      }
    };

    loadTeacherAnalytics();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [activeSection, token]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(classes.length / PAGE_SIZE)), [classes.length]);

  const visibleClasses = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return classes.slice(start, start + PAGE_SIZE);
  }, [classes, page]);

  const attentionRequired = useMemo(() => {
    return classes
      .filter((row) => clampPercent(row?.avgAttendancePercent) < 75 || clampPercent(row?.avgMarksPercent) < 50)
      .map((row) => {
        const lowAttendance = clampPercent(row?.avgAttendancePercent) < 75;
        const lowMarks = clampPercent(row?.avgMarksPercent) < 50;
        return {
          className: row.className,
          sectionName: row.sectionName,
          message:
            lowAttendance && lowMarks
              ? `Attendance ${clampPercent(row.avgAttendancePercent).toFixed(1)}% and marks ${clampPercent(row.avgMarksPercent).toFixed(1)}% are below target.`
              : lowAttendance
              ? `Attendance ${clampPercent(row.avgAttendancePercent).toFixed(1)}% is below 75%.`
              : `Average marks ${clampPercent(row.avgMarksPercent).toFixed(1)}% are below 50%.`,
        };
      });
  }, [classes]);

  const attentionTotalPages = useMemo(
    () => Math.max(1, Math.ceil(attentionRequired.length / ATTENTION_PAGE_SIZE)),
    [attentionRequired.length]
  );

  const visibleAttention = useMemo(() => {
    const start = (attentionPage - 1) * ATTENTION_PAGE_SIZE;
    return attentionRequired.slice(start, start + ATTENTION_PAGE_SIZE);
  }, [attentionRequired, attentionPage]);

  const prevPage = useCallback(() => setPage((prev) => Math.max(1, prev - 1)), []);
  const nextPage = useCallback(() => setPage((prev) => Math.min(totalPages, prev + 1)), [totalPages]);
  const prevAttentionPage = useCallback(
    () => setAttentionPage((prev) => Math.max(1, prev - 1)),
    []
  );
  const nextAttentionPage = useCallback(
    () => setAttentionPage((prev) => Math.min(attentionTotalPages, prev + 1)),
    [attentionTotalPages]
  );

  useEffect(() => {
    setAttentionPage((prev) => Math.min(prev, attentionTotalPages));
  }, [attentionTotalPages]);

  const teacherRows = useMemo(
    () => (Array.isArray(teacherAnalytics?.teachers) ? teacherAnalytics.teachers : []),
    [teacherAnalytics]
  );

  const teacherOverview = useMemo(() => {
    const fallback = {
      totalTeachers: 0,
      avgTeacherPerformance: 0,
      avgClassAttendance: 0,
      classesNeedingSupport: 0,
    };
    const src = teacherAnalytics?.overview || {};
    return {
      totalTeachers: toNum(src.totalTeachers ?? fallback.totalTeachers),
      avgTeacherPerformance: clampPercent(src.avgTeacherPerformance ?? fallback.avgTeacherPerformance),
      avgClassAttendance: clampPercent(src.avgClassAttendance ?? fallback.avgClassAttendance),
      classesNeedingSupport: toNum(src.classesNeedingSupport ?? fallback.classesNeedingSupport),
    };
  }, [teacherAnalytics]);

  const teacherPerformanceChartRows = useMemo(
    () =>
      teacherRows
        .slice()
        .sort((a, b) => toNum(b.performanceScore) - toNum(a.performanceScore))
        .slice(0, 12)
        .map((row) => ({
          teacherName: row.teacherName,
          teacherScore: clampPercent(row.performanceScore),
          classAverageScore: clampPercent(row.classAverageScore),
        })),
    [teacherRows]
  );

  const teacherAttendanceRows = useMemo(
    () =>
      teacherRows
        .slice()
        .sort((a, b) => toNum(b.classAttendancePercent) - toNum(a.classAttendancePercent))
        .slice(0, 12)
        .map((row) => ({
          teacherName: row.teacherName,
          attendancePercent: clampPercent(row.classAttendancePercent),
        })),
    [teacherRows]
  );

  const teacherAttentionRows = useMemo(
    () =>
      teacherRows
        .slice()
        .sort((a, b) => toNum(b.studentsNeedingAttention) - toNum(a.studentsNeedingAttention))
        .slice(0, 12),
    [teacherRows]
  );

  const topTeacherRows = useMemo(
    () =>
      (Array.isArray(teacherAnalytics?.topTeachers) ? teacherAnalytics.topTeachers : teacherRows)
        .slice()
        .sort((a, b) => toNum(b.performanceScore) - toNum(a.performanceScore))
        .slice(0, 5),
    [teacherAnalytics, teacherRows]
  );

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-[#071228] via-[#0b1c3f] to-[#12275b] px-4 py-5 md:p-6 font-sans tracking-tight antialiased overflow-hidden">
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="pointer-events-none absolute top-20 -right-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="w-full max-w-none mx-auto space-y-7">
        <div>
          <h2 className="text-[2.05rem] leading-tight font-black tracking-tight text-white">Admin Analytics</h2>
          <p className="mt-2 text-base text-slate-300">Premium school performance overview with class-level insight cards.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveSection("class")}
            className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
              activeSection === "class"
                ? "border-cyan-300/60 bg-cyan-500/25 text-cyan-100"
                : "border-white/20 bg-slate-900/50 text-slate-200 hover:bg-slate-800/70"
            }`}
          >
            Class Analytics
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("teacher")}
            className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
              activeSection === "teacher"
                ? "border-cyan-300/60 bg-cyan-500/25 text-cyan-100"
                : "border-white/20 bg-slate-900/50 text-slate-200 hover:bg-slate-800/70"
            }`}
          >
            Teacher Analytics
          </button>
        </div>

        {activeSection === "class" && (
        <>
        {error ? (
          <GlassCard className="rounded-[24px] p-5 border-rose-300/40 bg-rose-500/15">
            <p className="text-base font-semibold text-rose-100">{error}</p>
          </GlassCard>
        ) : null}

        <section>
          <div className="mb-5">
            <h3 className="text-2xl font-bold text-white">Overview</h3>
            <p className="mt-1 text-base text-slate-300">Live school stats</p>
          </div>
          {stages.overview ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              <OverviewCard icon="🎓" title="Total Students" value={overview.totalStudents} subtitle="Active enrollments" valueTone="text-cyan-200" />
              <OverviewCard icon="👩‍🏫" title="Total Teachers" value={overview.totalTeachers} subtitle="Teaching staff" valueTone="text-emerald-200" />
              <OverviewCard
                icon="🟢"
                title="Attendance"
                value={`${overview.attendanceStats.overallPercent.toFixed(1)}%`}
                subtitle={`${overview.attendanceStats.present} present out of ${overview.attendanceStats.totalRecords}`}
                valueTone="text-emerald-200"
              />
              <OverviewCard
                icon="📈"
                title="Avg Marks"
                value={`${overview.marksStats.overallAverage.toFixed(1)}%`}
                subtitle={`${overview.marksStats.totalEntries} mark entries`}
                valueTone="text-amber-200"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}
        </section>

        <section>
          <div className="mb-5">
            <h3 className="text-2xl font-bold text-white">Class Analytics</h3>
            <p className="mt-1 text-base text-slate-300">Performance by class and section</p>
          </div>
          {stages.classes ? (
            <>
              {visibleClasses.length ? (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                  {visibleClasses.map((row, index) => (
                    <ClassAnalyticsCard key={`${row.className || "na"}-${row.sectionName || "na"}-${index}`} row={row} index={index} />
                  ))}
                </div>
              ) : (
                <GlassCard className="rounded-[24px] p-5 border-white/15 bg-slate-900/45">
                  <p className="text-base text-slate-300">No class analytics available.</p>
                </GlassCard>
              )}
              {classes.length > PAGE_SIZE ? (
                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={prevPage}
                    disabled={page === 1}
                    className="rounded-full border border-white/20 bg-slate-900/60 px-5 py-2.5 text-sm font-semibold text-slate-100 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <p className="text-sm text-slate-300">
                    Page {page} of {totalPages}
                  </p>
                  <button
                    type="button"
                    onClick={nextPage}
                    disabled={page === totalPages}
                    className="rounded-full border border-white/20 bg-slate-900/60 px-5 py-2.5 text-sm font-semibold text-slate-100 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}
        </section>

        <section>
          <div className="mb-5">
            <h3 className="text-2xl font-bold text-white">Attention Required</h3>
            <p className="mt-1 text-base text-slate-300">Classes below attendance or marks thresholds</p>
          </div>
          {stages.attention ? (
            attentionRequired.length ? (
              <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                {visibleAttention.map((item, index) => (
                  <AttentionCard key={`${item.className}-${item.sectionName}-${index}`} item={item} />
                ))}
              </div>
              {attentionRequired.length > ATTENTION_PAGE_SIZE ? (
                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={prevAttentionPage}
                    disabled={attentionPage === 1}
                    className="rounded-full border border-white/20 bg-slate-900/60 px-5 py-2.5 text-sm font-semibold text-slate-100 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <p className="text-sm text-slate-300">
                    Page {attentionPage} of {attentionTotalPages}
                  </p>
                  <button
                    type="button"
                    onClick={nextAttentionPage}
                    disabled={attentionPage === attentionTotalPages}
                    className="rounded-full border border-white/20 bg-slate-900/60 px-5 py-2.5 text-sm font-semibold text-slate-100 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              ) : null}
              </>
            ) : (
              <GlassCard className="rounded-[24px] p-5 border-emerald-300/40 bg-emerald-500/15">
                <p className="text-base font-semibold text-emerald-100">All classes are within healthy thresholds.</p>
              </GlassCard>
            )
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}
        </section>
        </>
        )}

        {activeSection === "teacher" && (
          <>
            {teacherError ? (
              <GlassCard className="rounded-[24px] p-5 border-rose-300/40 bg-rose-500/15">
                <p className="text-base font-semibold text-rose-100">{teacherError}</p>
              </GlassCard>
            ) : null}

            <section>
              <div className="mb-5">
                <h3 className="text-2xl font-bold text-white">Teacher Analytics</h3>
                <p className="mt-1 text-base text-slate-300">Separate teacher performance and class health insights</p>
              </div>
              {teacherLoading ? (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                  <OverviewCard icon="TCH" title="Total Teachers" value={teacherOverview.totalTeachers} subtitle="Active teaching staff" valueTone="text-cyan-200" />
                  <OverviewCard icon="PRF" title="Avg Teacher Performance" value={`${teacherOverview.avgTeacherPerformance.toFixed(1)}%`} subtitle="Based on class average marks" valueTone="text-emerald-200" />
                  <OverviewCard icon="ATT" title="Avg Class Attendance" value={`${teacherOverview.avgClassAttendance.toFixed(1)}%`} subtitle="Teacher-wise class attendance" valueTone="text-amber-200" />
                  <OverviewCard icon="SUP" title="Classes Needing Support" value={teacherOverview.classesNeedingSupport} subtitle="Marks < 40 or attendance < 60" valueTone="text-rose-200" />
                </div>
              )}
            </section>

            <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <GlassCard className="rounded-[24px] p-5">
                <h3 className="text-xl font-bold text-white">Teacher Performance Comparison</h3>
                <p className="mt-1 text-sm text-slate-300">Teacher score vs class average score</p>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 md:grid md:grid-cols-1 md:gap-3 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
                  {teacherPerformanceChartRows.length === 0 ? (
                    <p className="text-sm text-slate-300">No teacher performance data available.</p>
                  ) : (
                    teacherPerformanceChartRows.map((row, idx) => (
                      <div
                        key={`${row.teacherName}-${idx}`}
                        className={`min-w-[260px] md:min-w-0 rounded-xl border p-3 ${
                          idx % 4 === 0
                            ? "border-cyan-300/35 bg-gradient-to-br from-cyan-500/25 via-sky-500/15 to-slate-900/50"
                            : idx % 4 === 1
                            ? "border-violet-300/35 bg-gradient-to-br from-violet-500/25 via-fuchsia-500/15 to-slate-900/50"
                            : idx % 4 === 2
                            ? "border-emerald-300/35 bg-gradient-to-br from-emerald-500/25 via-teal-500/15 to-slate-900/50"
                            : "border-amber-300/35 bg-gradient-to-br from-amber-500/25 via-orange-500/15 to-slate-900/50"
                        }`}
                      >
                        <p className="truncate text-sm font-semibold text-slate-100">{row.teacherName}</p>
                        <div className="mt-2 space-y-2">
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-200">
                              <span>Teacher Score</span>
                              <span className="font-bold text-white">{clampPercent(row.teacherScore).toFixed(1)}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-800/70">
                              <div
                                className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                                style={{ width: `${clampPercent(row.teacherScore)}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-200">
                              <span>Class Avg Score</span>
                              <span className="font-bold text-white">{clampPercent(row.classAverageScore).toFixed(1)}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-800/70">
                              <div
                                className="h-2 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-500"
                                style={{ width: `${clampPercent(row.classAverageScore)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>

              <GlassCard className="rounded-[24px] p-5">
                <h3 className="text-xl font-bold text-white">Teacher Attendance</h3>
                <p className="mt-1 text-sm text-slate-300">Teacher-wise class attendance percentage</p>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 md:grid md:grid-cols-1 md:gap-3 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
                  {teacherAttendanceRows.length === 0 ? (
                    <p className="text-sm text-slate-300">No teacher attendance data available.</p>
                  ) : (
                    teacherAttendanceRows.map((row, idx) => (
                      <div
                        key={`${row.teacherName}-${idx}`}
                        className={`min-w-[260px] md:min-w-0 rounded-xl border p-3 ${
                          idx % 3 === 0
                            ? "border-emerald-300/35 bg-gradient-to-br from-emerald-500/25 via-lime-500/15 to-slate-900/50"
                            : idx % 3 === 1
                            ? "border-cyan-300/35 bg-gradient-to-br from-cyan-500/25 via-blue-500/15 to-slate-900/50"
                            : "border-pink-300/35 bg-gradient-to-br from-pink-500/25 via-rose-500/15 to-slate-900/50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-slate-100">{row.teacherName}</p>
                          <span className="text-sm font-black text-emerald-100">{clampPercent(row.attendancePercent).toFixed(1)}%</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-800/70">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                            style={{ width: `${clampPercent(row.attendancePercent)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>
            </section>

            <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <GlassCard className="rounded-[24px] p-5">
                <h3 className="text-xl font-bold text-white">Students Needing Attention</h3>
                <p className="mt-1 text-sm text-slate-300">Students with marks &lt; 40 OR attendance &lt; 60</p>
                <ul className="mt-4 space-y-2">
                  {teacherAttentionRows.length === 0 ? (
                    <li className="text-sm text-slate-300">No flagged students.</li>
                  ) : (
                    teacherAttentionRows.map((row, idx) => (
                      <li key={`${row.teacherId || idx}`} className="flex items-center justify-between rounded-lg border border-white/15 bg-slate-900/45 px-3 py-2 text-sm">
                        <span className="font-semibold text-slate-100">{row.teacherName}</span>
                        <span className="font-black text-rose-200">{toNum(row.studentsNeedingAttention)}</span>
                      </li>
                    ))
                  )}
                </ul>
              </GlassCard>

              <GlassCard className="rounded-[24px] p-5">
                <h3 className="text-xl font-bold text-white">Top Performing Teachers</h3>
                <p className="mt-1 text-sm text-slate-300">Ranked by class marks + attendance</p>
                <ul className="mt-4 space-y-2">
                  {topTeacherRows.length === 0 ? (
                    <li className="text-sm text-slate-300">No teacher data available.</li>
                  ) : (
                    topTeacherRows.map((row, idx) => (
                      <li key={`${row.teacherId || idx}`} className="flex items-center justify-between rounded-lg border border-white/15 bg-slate-900/45 px-3 py-2 text-sm">
                        <span className="flex items-center gap-2 font-semibold text-slate-100">
                          <span
                            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm ${
                              idx === 0
                                ? "border-amber-300/60 bg-amber-500/25 text-amber-100"
                                : idx === 1
                                ? "border-slate-300/60 bg-slate-400/25 text-slate-100"
                                : idx === 2
                                ? "border-orange-300/60 bg-orange-500/25 text-orange-100"
                                : "border-cyan-300/50 bg-cyan-500/20 text-cyan-100"
                            }`}
                          >
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                          </span>
                          <span className="truncate">{row.teacherName}</span>
                        </span>
                        <span className="font-black text-emerald-200">{clampPercent(row.performanceScore).toFixed(1)}%</span>
                      </li>
                    ))
                  )}
                </ul>
              </GlassCard>
            </section>
          </>
        )}
      </div>
    </div>
  );
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#071228] via-[#0b1c3f] to-[#12275b] p-4 md:p-6 font-sans tracking-tight antialiased">
          <div className="max-w-none mx-auto w-full">
            <GlassCard className="p-4 border-rose-300/40 bg-rose-500/15">
              <p className="text-sm font-semibold text-rose-100">Analytics failed to render.</p>
            </GlassCard>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AdminAnalyticsDashboard(props) {
  return (
    <ErrorBoundary>
      <AdminAnalyticsContent {...props} />
    </ErrorBoundary>
  );
}
