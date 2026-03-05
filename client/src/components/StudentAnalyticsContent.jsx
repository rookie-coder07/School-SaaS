import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const clampPercent = (value) => Math.max(0, Math.min(100, toNum(value)));

const cleanText = (value) => {
  const text = String(value || "").trim();
  const lowered = text.toLowerCase();
  if (!text || lowered === "undefined" || lowered === "null" || lowered === "n/a" || lowered === "na") return "";
  return text;
};

const toMarkPercent = (entry) => {
  if (entry?.percentage !== undefined && entry?.percentage !== null) return clampPercent(entry.percentage);
  const marks = toNum(entry?.marks);
  const maxMarks = toNum(entry?.maxMarks) || 100;
  if (maxMarks <= 0) return clampPercent(marks);
  return clampPercent((marks / maxMarks) * 100);
};

const normalizeAnalytics = (analytics) => {
  const student = analytics?.student || {};
  const studentName = cleanText(student?.name || analytics?.studentName) || "Student";
  const className = cleanText(student?.class || student?.className || analytics?.className) || "-";
  const section = cleanText(student?.section || analytics?.section) || "-";
  const rollNo = cleanText(student?.rollNo || analytics?.rollNo) || "-";

  const attendancePercentage = clampPercent(
    analytics?.attendance?.percentage ?? analytics?.attendancePercentage ?? analytics?.attendancePercent
  );

  const sourceEntries = []
    .concat(Array.isArray(analytics?.subjectMarks) ? analytics.subjectMarks : [])
    .concat(Array.isArray(analytics?.subjectWiseMarks) ? analytics.subjectWiseMarks : [])
    .concat(Array.isArray(analytics?.marks?.subjects) ? analytics.marks.subjects : [])
    .concat(Array.isArray(analytics?.marks?.subjectAnalysis) ? analytics.marks.subjectAnalysis : [])
    .concat(Array.isArray(analytics?.marks?.records) ? analytics.marks.records : [])
    .concat(Array.isArray(analytics?.rawData?.marks) ? analytics.rawData.marks : [])
    .filter(Boolean);

  const marksEntries = sourceEntries
    .map((entry, idx) => {
      const subject = cleanText(entry?.subject || entry?.name);
      const exam = cleanText(entry?.exam || entry?.examName || entry?.test || entry?.assessment);
      const marksPercent = toMarkPercent(entry);
      return {
        id: `${subject || "subject"}-${exam || "exam"}-${idx}`,
        subject,
        exam,
        marks: marksPercent,
      };
    })
    .filter((entry) => entry.subject && Number.isFinite(entry.marks));

  const subjectMap = new Map();
  marksEntries.forEach((entry) => {
    const current = subjectMap.get(entry.subject) || { subject: entry.subject, list: [] };
    current.list.push(entry.marks);
    subjectMap.set(entry.subject, current);
  });

  const subjectAnalysis = Array.from(subjectMap.values()).map((row) => {
    const list = row.list;
    const avg = list.length ? list.reduce((sum, n) => sum + n, 0) / list.length : 0;
    const best = list.length ? Math.max(...list) : 0;
    const low = list.length ? Math.min(...list) : 0;
    return {
      subject: row.subject,
      avg: clampPercent(avg),
      best: clampPercent(best),
      low: clampPercent(low),
    };
  });

  const averageMarks =
    subjectAnalysis.length > 0
      ? clampPercent(subjectAnalysis.reduce((sum, row) => sum + row.avg, 0) / subjectAnalysis.length)
      : clampPercent(analytics?.averageMarks ?? analytics?.marks?.overallAverage);

  const uniqueExams = Array.from(new Set(marksEntries.map((entry) => entry.exam).filter(Boolean)));

  const growthJourney = uniqueExams
    .map((exam, idx) => {
      const examRows = marksEntries.filter((entry) => entry.exam === exam);
      const avg = examRows.length ? examRows.reduce((sum, row) => sum + row.marks, 0) / examRows.length : 0;
      return {
        exam,
        shortExam: exam.length > 12 ? `${exam.slice(0, 12)}...` : exam,
        average: clampPercent(avg),
        order: idx,
      };
    })
    .sort((a, b) => a.order - b.order);

  const weakestSubjects = subjectAnalysis.filter((row) => row.avg < 50).map((row) => row.subject);
  const strongestSubject = subjectAnalysis.sort((a, b) => b.avg - a.avg)[0]?.subject || "N/A";

  const areasOfAttention = [
    ...(attendancePercentage < 75 ? [`Low attendance (${attendancePercentage.toFixed(1)}%)`] : []),
    ...(weakestSubjects.length > 0 ? [`Weak subjects: ${weakestSubjects.join(", ")}`] : []),
  ];

  const personalizedInsights = [
    {
      title: "Attendance Focus",
      text:
        attendancePercentage < 75
          ? "Attend daily for the next 2 weeks to improve consistency."
          : "Great attendance. Keep this momentum.",
    },
    {
      title: "Subject Strategy",
      text:
        weakestSubjects.length > 0
          ? `Practice ${weakestSubjects.slice(0, 2).join(" and ")} for 20 minutes daily.`
          : `Strongest subject is ${strongestSubject}. Use it to build confidence.`,
    },
    {
      title: "Exam Readiness",
      text:
        growthJourney.length > 1 && growthJourney[growthJourney.length - 1].average < growthJourney[0].average
          ? "Your recent exam trend dipped slightly. Revise mistakes from the latest test."
          : "Your exam trend is stable/improving. Continue revision plan.",
    },
  ];

  return {
    studentName,
    className,
    section,
    rollNo,
    attendancePercentage,
    averageMarks,
    totalExams: uniqueExams.length,
    subjectPerformance: subjectAnalysis,
    growthJourney,
    areasOfAttention,
    detailedSubjectAnalysis: subjectAnalysis,
    personalizedInsights,
  };
};

const circleProgress = (percent) => {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  return { radius, circumference, strokeDashoffset };
};

export default function StudentAnalyticsContent({ analytics, loading, error }) {
  const data = useMemo(() => normalizeAnalytics(analytics || {}), [analytics]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-28 rounded-2xl border border-slate-200 bg-white/70 animate-pulse" />
        <div className="h-52 rounded-2xl border border-slate-200 bg-white/70 animate-pulse" />
        <div className="h-72 rounded-2xl border border-slate-200 bg-white/70 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
        {error}
      </div>
    );
  }

  const progress = circleProgress(data.attendancePercentage);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-[0_10px_25px_rgba(30,64,175,0.14)] backdrop-blur-lg">
        <h3 className="text-lg font-black text-slate-900">Student Profile</h3>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <div><span className="font-bold text-slate-700">Name:</span> <span className="text-slate-900">{data.studentName}</span></div>
          <div><span className="font-bold text-slate-700">Class:</span> <span className="text-slate-900">{data.className}</span></div>
          <div><span className="font-bold text-slate-700">Section:</span> <span className="text-slate-900">{data.section}</span></div>
          <div><span className="font-bold text-slate-700">Roll No:</span> <span className="text-slate-900">{data.rollNo}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-100/80 to-blue-100/70 p-4 shadow-md">
          <h4 className="text-sm font-bold text-slate-900 mb-3">Attendance Card</h4>
          <div className="flex items-center gap-4">
            <svg width="120" height="120" viewBox="0 0 120 120" aria-label="Attendance progress">
              <circle cx="60" cy="60" r={progress.radius} fill="none" stroke="#cbd5e1" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r={progress.radius}
                fill="none"
                stroke="#2563eb"
                strokeWidth="10"
                strokeDasharray={progress.circumference}
                strokeDashoffset={progress.strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
              <text x="60" y="66" textAnchor="middle" className="fill-slate-900 font-black text-xl">
                {Math.round(data.attendancePercentage)}%
              </text>
            </svg>
            <p className="text-sm text-slate-700 font-semibold">Overall attendance percentage</p>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-100/80 to-lime-100/70 p-4 shadow-md">
          <h4 className="text-sm font-bold text-slate-900 mb-3">Overall Performance Summary</h4>
          <div className="space-y-2 text-sm">
            <p><span className="font-bold text-slate-700">Average Marks:</span> <span className="font-black text-emerald-700">{data.averageMarks.toFixed(1)}%</span></p>
            <p><span className="font-bold text-slate-700">Total Exams:</span> <span className="font-black text-slate-900">{data.totalExams}</span></p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-violet-200 bg-white/75 p-4 shadow-md backdrop-blur-lg">
        <h4 className="text-sm font-bold text-slate-900 mb-3">Subject Performance Chart</h4>
        <div className="h-72 w-full min-w-0">
          {data.subjectPerformance.length === 0 ? (
            <div className="h-full grid place-items-center text-sm text-slate-500">No subject data available</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={220}>
              <BarChart data={data.subjectPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, "Average"]} />
                <Bar dataKey="avg" fill="#7c3aed" radius={[8, 8, 0, 0]}>
                  <LabelList dataKey="avg" position="top" formatter={(v) => `${toNum(v).toFixed(0)}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-white/75 p-4 shadow-md backdrop-blur-lg">
        <h4 className="text-sm font-bold text-slate-900 mb-3">Growth Journey Chart</h4>
        <div className="h-72 w-full min-w-0">
          {data.growthJourney.length === 0 ? (
            <div className="h-full grid place-items-center text-sm text-slate-500">No exam trend data available</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={220}>
              <LineChart data={data.growthJourney}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="shortExam" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, "Average"]} labelFormatter={(_, payload) => payload?.[0]?.payload?.exam || ""} />
                <Line type="monotone" dataKey="average" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-md">
        <h4 className="text-sm font-bold text-slate-900 mb-3">Areas of Attention</h4>
        {data.areasOfAttention.length === 0 ? (
          <p className="text-sm text-emerald-700 font-semibold">No major issues detected. Keep it up!</p>
        ) : (
          <ul className="space-y-2">
            {data.areasOfAttention.map((item, idx) => (
              <li key={`${item}-${idx}`} className="text-sm text-amber-900 font-semibold">- {item}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-md backdrop-blur-lg overflow-x-auto">
        <h4 className="text-sm font-bold text-slate-900 mb-3">Detailed Subject Analysis</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="px-3 py-2 text-left">Subject</th>
              <th className="px-3 py-2 text-right">Avg</th>
              <th className="px-3 py-2 text-right">Best</th>
              <th className="px-3 py-2 text-right">Low</th>
            </tr>
          </thead>
          <tbody>
            {data.detailedSubjectAnalysis.map((row) => (
              <tr key={row.subject} className="border-b border-slate-100">
                <td className="px-3 py-2 font-semibold text-slate-900">{row.subject}</td>
                <td className="px-3 py-2 text-right text-slate-700">{row.avg.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right text-emerald-700 font-semibold">{row.best.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right text-rose-700 font-semibold">{row.low.toFixed(1)}%</td>
              </tr>
            ))}
            {data.detailedSubjectAnalysis.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-center text-slate-500">
                  No subject analysis available
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-100/70 to-cyan-100/70 p-4 shadow-md">
        <h4 className="text-sm font-bold text-slate-900 mb-3">Personalized Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {data.personalizedInsights.map((item, idx) => (
            <div key={`${item.title}-${idx}`} className="rounded-xl border border-white/80 bg-white/80 p-3">
              <p className="text-sm font-bold text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs text-slate-700">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
