import React, { memo, useEffect, useState } from "react";
import PageContainer from "./ui/PageContainer";
import { Card, StatCard } from "./ui/Card";
import { SectionLoader } from "./ui/Loaders";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const MAX_INITIAL = 6;

const STATUS_STYLES = {
  Good: {
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    accent: "border-emerald-300",
    header: "bg-emerald-500",
    card: "bg-emerald-50/60",
    metric: "bg-emerald-50 border-emerald-100",
  },
  Average: {
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    accent: "border-amber-300",
    header: "bg-amber-500",
    card: "bg-amber-50/60",
    metric: "bg-amber-50 border-amber-100",
  },
  "Needs Attention": {
    badge: "bg-red-100 text-red-800 border-red-200",
    accent: "border-red-300",
    header: "bg-red-500",
    card: "bg-red-50/60",
    metric: "bg-red-50 border-red-100",
  },
};

const sortByClassSection = (rows = []) => {
  return [...rows].sort((a, b) => {
    const classCompare = String(a.class || "").localeCompare(String(b.class || ""), undefined, {
      numeric: true,
      sensitivity: "base",
    });
    if (classCompare !== 0) return classCompare;
    return String(a.section || "").localeCompare(String(b.section || ""), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
};

const computeStatus = (attendance, marks) => {
  if (attendance >= 75 && marks >= 60) return "Good";
  if (attendance < 50 || marks < 40) return "Needs Attention";
  if ((attendance >= 50 && attendance < 75) || (marks >= 40 && marks < 60)) return "Average";
  return "Needs Attention";
};

const isMobileViewport = () => (typeof window !== "undefined" ? window.innerWidth <= 768 : false);

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
      return <div>Analytics failed to load</div>;
    }
    return this.props.children;
  }
}

const Loader = () => <SectionLoader rows={4} label="Loading analytics..." />;

const ClassCard = memo(function ClassCard({ row }) {
  const attendanceNum = Number(row?.avgAttendancePercent ?? 0);
  const marksNum = Number(row?.avgMarksPercent ?? 0);
  const attendance = Number(row?.avgAttendancePercent ?? 0).toFixed(1);
  const marks = Number(row?.avgMarksPercent ?? 0).toFixed(1);
  const status = computeStatus(attendanceNum, marksNum);
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES["Needs Attention"];

  return (
    <div
      className={`rounded-2xl border shadow-sm overflow-hidden transition hover:shadow-md min-w-0 ${statusStyle.accent} ${statusStyle.card}`}
    >
      <div className={`${statusStyle.header} h-1.5`} />
      <div className="p-3 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base md:text-lg font-bold text-slate-900 break-words">
              Class {row?.class}-{row?.section}
            </h3>
            <p className="text-xs md:text-sm text-slate-600 mt-1 break-words">
              Teacher: <span className="font-semibold text-slate-800">{row?.classTeacherName || "Not Assigned"}</span>
            </p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusStyle.badge}`}>
            {status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className={`rounded-xl border px-3 py-2 ${statusStyle.metric}`}>
            <p className="text-xs text-slate-500">Students</p>
            <p className="text-lg font-black text-slate-900">{Number(row?.totalStudents ?? 0)}</p>
          </div>
          <div className={`rounded-xl border px-3 py-2 ${statusStyle.metric}`}>
            <p className="text-xs text-slate-500">Attendance</p>
            <p className="text-lg font-black text-slate-900">{Number(attendance ?? 0).toFixed(1)}%</p>
          </div>
          <div className={`rounded-xl border px-3 py-2 ${statusStyle.metric}`}>
            <p className="text-xs text-slate-500">Marks</p>
            <p className="text-lg font-black text-slate-900">{Number(marks ?? 0).toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
});

const AdminAnalyticsContent = memo(function AdminAnalyticsContent({ token, schoolId }) {
  const [analytics, setAnalytics] = useState(null);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState("");
  const [isMobile, setIsMobile] = useState(isMobileViewport());
  const [visibleCount, setVisibleCount] = useState(MAX_INITIAL);

  useEffect(() => {
    const handleResize = () => setIsMobile(isMobileViewport());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setVisibleCount(Number.MAX_SAFE_INTEGER);
      return;
    }
    setVisibleCount(MAX_INITIAL);
  }, [isMobile]);

  const fetchAnalytics = async () => {
    if (!token || !schoolId) {
      setAnalytics([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setWarning("");

    try {
      const res = await fetch(`${API_URL}/api/admin/analytics/class-comparison`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Analytics request failed (${res.status})`);
      }

      const data = await res.json().catch(() => ({}));
      setAnalytics(sortByClassSection(Array.isArray(data?.data) ? data.data : []));
      setSummary(data?.summary || {});
    } catch {
      setWarning("Analytics API is unavailable.");
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    fetchAnalytics();
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  if (loading) {
    return <Loader />;
  }

  if (!analytics || analytics.length === 0) {
    return <Loader />;
  }

  const visibleClasses = isMobile
    ? analytics.slice(0, visibleCount)
    : analytics;

  const canLoadMore = isMobile && visibleCount < analytics.length;

  return (
    <PageContainer className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-black text-slate-900">Class-wise Performance Overview</h2>
        <p className="text-sm text-slate-600">Instant class health view for school leadership</p>
      </div>

      {warning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warning}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={Number(summary?.totalStudents ?? 0)} icon="Students" tone="blue" />
        <StatCard label="Total Teachers" value={Number(summary?.totalTeachers ?? 0)} icon="Teachers" tone="green" />
        <StatCard label="Total Classes / Sections" value={Number(summary?.totalClasses ?? 0)} icon="Classes" tone="purple" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleClasses.map((row) => (
          <ClassCard key={`${row?.class}-${row?.section}`} row={row} />
        ))}
      </div>

      {canLoadMore && (
        <Card className="text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + MAX_INITIAL)}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition"
          >
            Load More
          </button>
        </Card>
      )}
    </PageContainer>
  );
});

export default function AdminAnalyticsDashboard(props) {
  return (
    <ErrorBoundary>
      <AdminAnalyticsContent {...props} />
    </ErrorBoundary>
  );
}

