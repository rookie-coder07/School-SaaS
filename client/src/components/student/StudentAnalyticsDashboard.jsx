import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useToast } from "../ToastProvider";

const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, toNum(value)));

const cleanText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  const lowered = text.toLowerCase();
  if (!text || lowered === "undefined" || lowered === "null" || lowered === "n/a" || lowered === "na") return fallback;
  return text;
};

const normalizeAnalytics = (analytics) => {
  const student = analytics?.student || {};
  const attendanceRaw = analytics?.attendance || {};
  const marksRaw = analytics?.marks || {};

  const attendance = {
    total: Math.max(0, toNum(attendanceRaw?.total)),
    present: Math.max(0, toNum(attendanceRaw?.present)),
    absent: Math.max(0, toNum(attendanceRaw?.absent)),
    percentage: clamp(attendanceRaw?.percentage ?? 0),
  };
  if (attendance.total === 0 && attendance.present > 0) {
    attendance.total = attendance.present + attendance.absent;
  }

  const normalizedSubjects = (Array.isArray(marksRaw?.subjects) ? marksRaw.subjects : [])
    .map((s) => ({
      name: cleanText(s?.subject || s?.name, "Unknown Subject"),
      average: clamp(s?.average ?? s?.avg ?? s?.marks ?? 0),
      highest: clamp(s?.highest ?? s?.best ?? s?.max ?? 0),
      lowest: clamp(s?.lowest ?? s?.low ?? s?.min ?? 0),
    }));

  const subjectBenchmarkData =
    normalizedSubjects.length > 0
      ? normalizedSubjects
      : [{ name: "Unknown Subject", average: 0, highest: 0, lowest: 0 }];

  const examTrendDataRaw = Array.isArray(marksRaw?.examTrends) ? marksRaw.examTrends : [];
  const examTrendData =
    examTrendDataRaw.length > 0
      ? examTrendDataRaw.map((e, idx) => ({
          exam: cleanText(e?.exam || e?.name, `Exam ${idx + 1}`),
          average: clamp(e?.average ?? e?.marks ?? e?.score ?? 0),
        }))
      : [{ exam: "No Data", average: 0 }];

  const sorted = [...subjectBenchmarkData]
    .filter((s) => cleanText(s?.name, "") !== "")
    .sort((a, b) => b.average - a.average);

  const apiBestSubject = marksRaw?.bestSubject
    ? {
        subject: cleanText(marksRaw.bestSubject?.subject || marksRaw.bestSubject?.name, ""),
        average: clamp(marksRaw.bestSubject?.average ?? marksRaw.bestSubject?.avg ?? 0),
      }
    : null;
  const bestSubject =
    apiBestSubject && apiBestSubject.subject
      ? apiBestSubject
      : { subject: cleanText(sorted[0]?.name, "Unknown Subject"), average: sorted[0]?.average ?? 0 };

  const apiWeakestSubject = marksRaw?.weakestSubject
    ? {
        subject: cleanText(marksRaw.weakestSubject?.subject || marksRaw.weakestSubject?.name, ""),
        average: clamp(marksRaw.weakestSubject?.average ?? marksRaw.weakestSubject?.avg ?? 0),
      }
    : null;
  const weakestSubject =
    apiWeakestSubject && apiWeakestSubject.subject
      ? apiWeakestSubject
      : { subject: cleanText(sorted[sorted.length - 1]?.name, "Unknown Subject"), average: sorted[sorted.length - 1]?.average ?? 0 };

  const subjectAvg =
    normalizedSubjects.length > 0
      ? normalizedSubjects.reduce((sum, subject) => sum + toNum(subject.average), 0) / normalizedSubjects.length
      : 0;
  const trendAvg =
    examTrendDataRaw.length > 0
      ? examTrendDataRaw.reduce((sum, entry) => sum + clamp(entry?.average ?? entry?.marks ?? entry?.score ?? 0), 0) /
        examTrendDataRaw.length
      : 0;
  const rawOverall = clamp(marksRaw?.overallAverage ?? 0);
  const derivedOverall = rawOverall > 0 ? rawOverall : subjectAvg > 0 ? clamp(subjectAvg) : clamp(trendAvg);

  const resolvedTotalExams = Math.max(0, toNum(marksRaw?.totalExams)) || examTrendDataRaw.length;

  const marks = {
    overallAverage: Math.round(derivedOverall),
    totalExams: resolvedTotalExams,
    bestSubject,
    weakestSubject,
    examTrends: examTrendData,
    subjects: subjectBenchmarkData,
  };

  const riskIndicators = Array.isArray(analytics?.riskIndicators) ? analytics.riskIndicators.filter(Boolean) : [];
  const suggestions = Array.isArray(analytics?.suggestions) ? analytics.suggestions.filter(Boolean) : [];

  return {
    student: {
      name: cleanText(student?.name, "Student"),
      class: cleanText(student?.class, "-"),
      section: cleanText(student?.section, "-"),
      rollNo: student?.rollNo ?? "-",
      email: cleanText(student?.email, "-"),
    },
    attendance,
    marks,
    riskIndicators,
    suggestions,
    subjectBenchmarkData,
    examTrendData,
  };
};

export default function StudentAnalyticsDashboard({
  endpoint,
  authToken,
  onBack,
  hideInternalBackButton = false,
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(endpoint, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || `Failed to fetch analytics (${res.status})`);
        }

        const data = await res.json();
        setAnalytics(data || {});
      } catch (err) {
        if (err?.name === "AbortError") return;
        const msg = err?.message || "Failed to load student analytics";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    if (endpoint && authToken) fetchAnalytics();
    else {
      setLoading(false);
      setError("Analytics endpoint or token is missing.");
    }

    return () => controller.abort();
  }, [endpoint, authToken, toast]);

  const data = useMemo(() => normalizeAnalytics(analytics || {}), [analytics]);
  const { student, attendance, marks, riskIndicators, suggestions, subjectBenchmarkData, examTrendData } = data;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-200 mt-4">Loading student analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
        <div className="max-w-6xl mx-auto bg-red-500/20 border border-red-300/40 rounded-xl p-6 text-center text-red-100">
          <p className="font-semibold">Error: {error}</p>
          {typeof onBack === "function" ? (
            <button onClick={onBack} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
              Go Back
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-2000" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-8">
          {!hideInternalBackButton && typeof onBack === "function" ? (
            <button onClick={onBack} className="text-blue-300 hover:text-blue-200 font-semibold text-sm mb-4 flex items-center transition">
              ← Back to Dashboard
            </button>
          ) : null}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-5xl font-bold break-words text-white mb-2">{student.name}'s Learning Profile</h1>
              <p className="text-blue-200 text-base font-semibold break-words whitespace-normal">
                Class {student.class} • Section {student.section} • Analyzing growth & potential 📊
              </p>
            </div>
            <div className="w-full md:w-auto max-w-full md:max-w-sm min-w-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3">
              <p className="text-blue-100 text-sm break-words whitespace-normal">Roll No: <span className="font-bold text-white">{student.rollNo}</span></p>
              <p className="text-blue-100 text-sm break-words whitespace-normal">{student.email}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-bold text-blue-200 uppercase tracking-widest">Attendance</div>
                <div className="text-4xl font-black text-white mt-3">{attendance.percentage}%</div>
                <div className="text-xs text-blue-100 mt-3 font-medium">{attendance.present} Present / {attendance.total} Days</div>
              </div>
              <div className="text-4xl">{attendance.percentage >= 80 ? "⭐" : attendance.percentage >= 60 ? "⚡" : "⚠️"}</div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs font-semibold text-blue-100">{attendance.percentage >= 80 ? "🎯 Excellent!" : attendance.percentage >= 60 ? "📈 Improving" : "🚨 Focus needed"}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-bold text-pink-200 uppercase tracking-widest">Overall Performance</div>
                <div className="text-4xl font-black text-white mt-3">{marks.overallAverage}</div>
                <div className="text-xs text-pink-100 mt-3 font-medium">Out of 100 • {marks.totalExams} exams</div>
              </div>
              <div className="text-4xl">{marks.overallAverage >= 80 ? "🏆" : marks.overallAverage >= 60 ? "📚" : "🎓"}</div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10"><p className="text-xs font-semibold text-pink-100">{marks.overallAverage >= 80 ? "✅ Outstanding!" : marks.overallAverage >= 60 ? "✔️ Good" : "📖 Keep going"}</p></div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-bold text-emerald-200 uppercase tracking-widest">Your Strength</div>
                <div className="text-2xl font-black text-white mt-3">{marks.bestSubject?.subject || "Unknown Subject"}</div>
                <div className="text-xs text-emerald-100 mt-3 font-medium">Avg: {marks.bestSubject?.average ?? 0}/100</div>
              </div>
              <div className="text-4xl">🌟</div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10"><p className="text-xs font-semibold text-emerald-100">💪 Your best subject!</p></div>
          </div>

          <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-bold text-orange-200 uppercase tracking-widest">Growth Area</div>
                <div className="text-2xl font-black text-white mt-3">{marks.weakestSubject?.subject || "Unknown Subject"}</div>
                <div className="text-xs text-orange-100 mt-3 font-medium">Avg: {marks.weakestSubject?.average ?? 0}/100</div>
              </div>
              <div className="text-4xl">🎯</div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10"><p className="text-xs font-semibold text-orange-100">📝 Opportunity zone</p></div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-1">📊 Performance Analytics</h2>
          <p className="text-blue-200 text-sm mb-6">Dive deep into your learning patterns and discover insights</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-500/20 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-6 overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📈</span>
              <div><h3 className="text-base font-bold text-white">Your Growth Journey</h3><p className="text-xs text-blue-200">How your marks improved over exams</p></div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={examTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="exam" tick={{ fontSize: 11, fill: "#cbd5e1" }} angle={-30} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fill: "#cbd5e1" }} />
                <Tooltip formatter={(value) => `${toNum(value)}/100`} contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#fff" }} />
                <Line type="monotone" dataKey="average" stroke="#3b82f6" strokeWidth={3} dot={{ fill: "#3b82f6", r: 5, strokeWidth: 2, stroke: "#fff" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-6 overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📚</span>
              <div><h3 className="text-base font-bold text-white">Subject Performance</h3><p className="text-xs text-blue-200">Your score in each subject</p></div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={subjectBenchmarkData} margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#cbd5e1" }} angle={-30} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fill: "#cbd5e1" }} />
                <Tooltip formatter={(value) => `${toNum(value)}/100`} contentStyle={{ backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#fff" }} />
                <Bar dataKey="average" fill="#3b82f6" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-emerald-500/20 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🎯</span>
              <div><h3 className="text-base font-bold text-white">Attendance Record</h3><p className="text-xs text-emerald-200">Your presence and engagement</p></div>
            </div>
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle cx="100" cy="100" r="90" fill="none" stroke="url(#attendanceGrad)" strokeWidth="8" strokeDasharray={`${(attendance.percentage / 100) * 565.5} 565.5`} strokeLinecap="round" />
                  <defs><linearGradient id="attendanceGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#059669" /></linearGradient></defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-4xl font-black text-white">{attendance.percentage}%</div>
                  <div className="text-xs text-emerald-200 font-semibold">Present</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full text-center">
                <div className="bg-gradient-to-br from-emerald-500/30 to-teal-500/30 rounded-lg p-4 border border-emerald-300/50"><div className="text-2xl font-bold text-emerald-300">{attendance.present}</div><div className="text-xs text-emerald-200 font-semibold">Days Present</div></div>
                <div className="bg-gradient-to-br from-red-500/30 to-rose-500/30 rounded-lg p-4 border border-red-300/50"><div className="text-2xl font-bold text-red-300">{attendance.absent}</div><div className="text-xs text-red-200 font-semibold">Days Absent</div></div>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📖</span>
              <div><h3 className="text-base font-bold text-white">Detailed Subject Analysis</h3><p className="text-xs text-blue-200">Best, average, and lowest scores by subject</p></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 border-b border-white/10"><tr><th className="px-3 py-2 text-left font-semibold text-blue-100">Subject</th><th className="px-3 py-2 text-right font-semibold text-blue-100">Avg</th><th className="px-3 py-2 text-right font-semibold text-blue-100">Best</th><th className="px-3 py-2 text-right font-semibold text-blue-100">Low</th></tr></thead>
                <tbody>{subjectBenchmarkData.map((subject, idx) => (<tr key={`${subject.name}-${idx}`} className="border-b border-white/10"><td className="px-3 py-2 text-blue-100 font-semibold">{subject?.name || "Unknown Subject"}</td><td className="px-3 py-2 text-right font-bold text-white">{subject?.average ?? 0}</td><td className="px-3 py-2 text-right text-emerald-300">{subject?.highest ?? 0}</td><td className="px-3 py-2 text-right text-orange-300">{subject?.lowest ?? 0}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-1">🔍 Subject-Wise Deep Dive</h2>
          <p className="text-blue-200 text-sm mb-6">Personalized insights for each subject to guide your improvement</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectBenchmarkData.map((subject, idx) => {
              const avg = subject?.average ?? 0;
              const best = subject?.highest ?? 0;
              const low = subject?.lowest ?? 0;
              const name = subject?.name || "Unknown Subject";
              const isStrong = avg >= 75;
              const needsHelp = avg < 60;
              return (
                <div key={`${name}-${idx}`} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-6">
                  <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-white">{name}</h3><div className="text-3xl font-black text-blue-300">{avg}</div></div>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2"><span className="text-xs text-blue-200 font-semibold">Performance</span><span className="text-xs text-blue-100">{isStrong ? "⭐ Strong" : needsHelp ? "⚠️ Needs Help" : "📈 Good"}</span></div>
                    <div className="w-full bg-white/10 rounded-full h-2"><div className={`h-2 rounded-full ${isStrong ? "bg-emerald-500" : needsHelp ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${Math.min(avg, 100)}%` }} /></div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="bg-white/5 rounded-lg p-2 text-blue-100">{isStrong ? `🌟 Excellent performance! Your ${avg}/100 average shows strong mastery.` : needsHelp ? `⚠️ This subject needs immediate attention. With ${avg}/100, prioritize dedicated study sessions and seek extra help.` : `📚 You're doing okay in ${name}. Aim to improve from ${avg} to 75+ for stronger performance.`}</div>
                    <div className="flex gap-2 justify-between"><span className="bg-emerald-500/30 px-2 py-1 rounded text-emerald-200 flex-1 text-center">Best: {best}</span><span className="bg-orange-500/30 px-2 py-1 rounded text-orange-200 flex-1 text-center">Low: {low}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {riskIndicators.length > 0 && (
            <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-6">
              <div className="flex items-center gap-3 mb-5"><div className="text-4xl">🚨</div><div><h3 className="text-lg font-bold text-red-200">Areas of Attention</h3><p className="text-xs text-red-100/80">Things to work on for improvement</p></div></div>
              <div className="space-y-3">{riskIndicators.map((item, idx) => (<div key={`${idx}-${item}`} className="bg-white/10 rounded-lg p-3 border-l-4 border-red-400"><div className="flex items-start gap-2"><span className="text-lg mt-0.5">⚡</span><p className="text-sm font-semibold text-red-100">{item}</p></div></div>))}</div>
            </div>
          )}

          <div className="bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-500/20 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-5"><div className="text-4xl">✨</div><div><h3 className="text-lg font-bold text-cyan-200">Your Learning Journey</h3><p className="text-xs text-cyan-100/80">Personalized insights & actionable tips</p></div></div>
            <div className="space-y-3">
              {suggestions.length > 0 ? suggestions.map((s, idx) => (<div key={`${idx}-${s}`} className="bg-white/10 rounded-lg p-3 border-l-4 border-cyan-400"><div className="flex items-start gap-2"><span className="text-lg mt-0.5">💡</span><p className="text-sm font-semibold text-cyan-100">{s}</p></div></div>)) : <div className="bg-white/10 rounded-lg p-4 border-l-4 border-emerald-400 text-center"><p className="text-sm font-semibold text-emerald-200">🌟 You're doing great! Keep up the momentum!</p></div>}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-2xl shadow-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-black/20 to-black/40 p-8 backdrop-blur-sm">
            <div className="flex items-start gap-6">
              <div className="text-6xl">🎯</div>
              <div>
                <h2 className="text-3xl font-black text-white mb-3">Your Success Story Starts Here</h2>
                <p className="text-yellow-50 text-base leading-relaxed mb-4 font-semibold">Every exceptional student shares one trait: they recognize their potential and take action. Based on your data, you have what it takes to excel. The path to success is clear:</p>
                <ul className="text-yellow-50 text-sm space-y-1 mb-4"><li>✅ Master your growth areas with focused practice</li><li>✅ Maintain momentum in your strong subjects</li><li>✅ Seek support when you need it</li><li>✅ Celebrate every milestone</li></ul>
                <div className="flex gap-2 flex-wrap"><span className="px-4 py-2 bg-white/20 rounded-full text-sm font-bold text-white">📈 Keep Improving</span><span className="px-4 py-2 bg-white/20 rounded-full text-sm font-bold text-white">🎓 Stay Focused</span><span className="px-4 py-2 bg-white/20 rounded-full text-sm font-bold text-white">⭐ Achieve Excellence</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
