import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const chartTooltipStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  color: "#e2e8f0",
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toMarkPercent = (row) => {
  if (row?.percentage !== undefined && row?.percentage !== null) {
    const pct = toNumber(row.percentage);
    return Math.max(0, Math.min(100, pct));
  }
  const marks = toNumber(row?.marks);
  const maxMarks = toNumber(row?.maxMarks) || 100;
  if (maxMarks <= 0) return 0;
  const pct = (marks / maxMarks) * 100;
  return Math.max(0, Math.min(100, pct));
};

const formatDateKey = (date) => date.toISOString().slice(0, 10);

const getLast7Days = () => {
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push(d);
  }
  return days;
};

const parseTeacher = () => {
  try {
    return JSON.parse(localStorage.getItem("teacherData") || "{}");
  } catch {
    return {};
  }
};

export default function TeacherAnalyticsOverview({ onGoToSummary }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marksRows, setMarksRows] = useState([]);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [studentsRows, setStudentsRows] = useState([]);
  const [dailyAttendanceRows, setDailyAttendanceRows] = useState([]);

  const token = localStorage.getItem("teacherToken");
  const teacher = useMemo(() => parseTeacher(), []);
  const className = teacher?.class || "";
  const section = teacher?.section || "";

  useEffect(() => {
    if (!token || !className || !section) {
      setLoading(false);
      setError("Missing teacher context for analytics");
      return;
    }

    const controller = new AbortController();

    const fetchAnalytics = async () => {
      setLoading(true);
      setError("");
      try {
        const [marksRes, attendanceRes, studentsRes] = await Promise.all([
          fetch(`${API_URL}/api/teacher/marks`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }),
          fetch(
            `${API_URL}/api/teacher/attendance/summary?className=${encodeURIComponent(className)}&section=${encodeURIComponent(section)}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              signal: controller.signal,
            }
          ),
          fetch(`${API_URL}/api/teacher/students?className=${encodeURIComponent(className)}&section=${encodeURIComponent(section)}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }),
        ]);

        const marksData = marksRes.ok ? await marksRes.json() : [];
        const attendanceData = attendanceRes.ok ? await attendanceRes.json() : [];
        const studentsData = studentsRes.ok ? await studentsRes.json() : [];
        const studentCount = Array.isArray(studentsData) ? studentsData.length : 0;

        const days = getLast7Days();
        const dailyAttendanceResponses = await Promise.all(
          days.map(async (day) => {
            const date = formatDateKey(day);
            const res = await fetch(
              `${API_URL}/api/teacher/attendance?date=${date}&className=${encodeURIComponent(className)}&section=${encodeURIComponent(section)}`,
              {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
              }
            );
            if (!res.ok) return { date, presentCount: 0, totalStudents: studentCount };
            const data = await res.json();
            return {
              date,
              presentCount: toNumber(data?.presentCount),
              totalStudents: toNumber(data?.totalStudents) || studentCount,
            };
          })
        );

        setMarksRows(Array.isArray(marksData) ? marksData : []);
        setAttendanceRows(Array.isArray(attendanceData) ? attendanceData : []);
        setStudentsRows(Array.isArray(studentsData) ? studentsData : []);
        setDailyAttendanceRows(dailyAttendanceResponses);
      } catch (err) {
        if (err?.name === "AbortError") return;
        setError("Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    return () => controller.abort();
  }, [token, className, section]);

  const studentMetaMap = useMemo(() => {
    const map = new Map();
    studentsRows.forEach((row) => {
      map.set(String(row?._id || ""), {
        name: row?.name || "Student",
        rollNo: toNumber(row?.rollNo),
      });
    });
    return map;
  }, [studentsRows]);

  const classPerformanceData = useMemo(() => {
    const subjectMap = new Map();
    marksRows.forEach((row) => {
      const key = String(row?.subject || "Unknown");
      const current = subjectMap.get(key) || { total: 0, count: 0 };
      current.total += toMarkPercent(row);
      current.count += 1;
      subjectMap.set(key, current);
    });
    return Array.from(subjectMap.entries())
      .map(([subject, value]) => ({
        subject,
        average: value.count ? Math.round(value.total / value.count) : 0,
      }))
      .sort((a, b) => b.average - a.average);
  }, [marksRows]);

  const attendanceTrendData = useMemo(
    () =>
      dailyAttendanceRows.map((row) => {
        const total = toNumber(row?.totalStudents);
        const present = toNumber(row?.presentCount);
        const pct = total > 0 ? Math.round((present / total) * 100) : 0;
        const d = new Date(`${row.date}T00:00:00`);
        const dayLabel = d.toLocaleDateString(undefined, { weekday: "short" });
        const dateLabel = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        return {
          dayLabel,
          dateLabel,
          percentage: pct,
        };
      }),
    [dailyAttendanceRows]
  );

  const marksDistributionData = useMemo(() => {
    const bins = [
      { name: "Fail (0-39)", count: 0 },
      { name: "Average (40-59)", count: 0 },
      { name: "Good (60-79)", count: 0 },
      { name: "Excellent (80-100)", count: 0 },
    ];

    marksRows.forEach((row) => {
      const mark = toMarkPercent(row);
      if (mark < 40) bins[0].count += 1;
      else if (mark < 60) bins[1].count += 1;
      else if (mark < 80) bins[2].count += 1;
      else bins[3].count += 1;
    });

    return bins;
  }, [marksRows]);

  const performanceLists = useMemo(() => {
    const perStudent = new Map();

    marksRows.forEach((row) => {
      const id = String(row?.studentId || "");
      if (!id) return;
      const current = perStudent.get(id) || { total: 0, count: 0 };
      current.total += toMarkPercent(row);
      current.count += 1;
      perStudent.set(id, current);
    });

    const averaged = Array.from(perStudent.entries()).map(([id, value]) => ({
      id,
      name: studentMetaMap.get(id)?.name || "Student",
      average: value.count ? Math.round(value.total / value.count) : 0,
    }));

    const top = [...averaged].sort((a, b) => b.average - a.average).slice(0, 5);
    const weak = [...averaged].filter((row) => row.average < 50).sort((a, b) => a.average - b.average).slice(0, 8);

    return { top, weak };
  }, [marksRows, studentMetaMap]);

  const summaryMetrics = useMemo(() => {
    const totalStudents = studentsRows.length;
    const averageMarks = marksRows.length
      ? Math.round(
          marksRows.reduce((sum, row) => sum + toMarkPercent(row), 0) /
            marksRows.length
        )
      : 0;
    const attendancePercentages = attendanceRows.map((row) => {
      const total = toNumber(row?.total);
      const present = toNumber(row?.present);
      return total > 0 ? (present / total) * 100 : 0;
    });
    const averageAttendance = attendancePercentages.length
      ? Math.round(
          attendancePercentages.reduce((sum, val) => sum + val, 0) /
            attendancePercentages.length
        )
      : 0;

    return { totalStudents, averageMarks, averageAttendance };
  }, [studentsRows, marksRows, attendanceRows]);

  const insightMetrics = useMemo(() => {
    const topStudent = performanceLists.top[0] || null;
    const atRiskCount = performanceLists.weak.length;
    return {
      topStudentName: topStudent?.name || "N/A",
      topStudentScore: topStudent?.average || 0,
      atRiskCount,
    };
  }, [performanceLists]);

  const studentsNeedingAttention = useMemo(() => {
    const attendanceMap = new Map();
    attendanceRows.forEach((row) => {
      const id = String(row?.studentId || row?._id || row?.studentUserId || "");
      const total = toNumber(row?.total);
      const present = toNumber(row?.present);
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      attendanceMap.set(id, percentage);
    });

    const marksMap = new Map();
    marksRows.forEach((row) => {
      const id = String(row?.studentId || "");
      if (!id) return;
      const current = marksMap.get(id) || { total: 0, count: 0 };
      current.total += toMarkPercent(row);
      current.count += 1;
      marksMap.set(id, current);
    });

    const rows = studentsRows.map((student) => {
      const id = String(student?._id || "");
      const attendance = attendanceMap.get(id) ?? 0;
      const marksAgg = marksMap.get(id);
      const avgMarks = marksAgg?.count ? Math.round(marksAgg.total / marksAgg.count) : 0;
      let issue = "";
      if (attendance < 75 && avgMarks < 50) issue = "Low attendance + weak marks";
      else if (attendance < 75) issue = "Low attendance";
      else if (avgMarks < 50) issue = "Weak marks";
      return {
        id,
        name: student?.name || "Student",
        attendance,
        avgMarks,
        issue,
      };
    });

    return rows.filter((row) => row.issue).sort((a, b) => a.avgMarks - b.avgMarks).slice(0, 12);
  }, [studentsRows, attendanceRows, marksRows]);

  if (loading) {
    return (
      <div className="space-y-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 md:p-6 shadow-2xl border border-slate-800">
        <h2 className="text-lg font-black tracking-tight text-white">Teacher Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 rounded-2xl border border-indigo-500/40 bg-slate-900/80 shadow-md animate-pulse" />
          <div className="h-64 rounded-2xl border border-cyan-500/40 bg-slate-900/80 shadow-md animate-pulse" />
          <div className="h-64 rounded-2xl border border-purple-500/40 bg-slate-900/80 shadow-md animate-pulse md:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 md:p-6 shadow-2xl border border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white">Teacher Analytics Dashboard</h2>
          <p className="text-sm text-slate-300 mt-1 font-medium">
            Class {className} - Section {section}
          </p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-200">
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-400" />
            Live Class Insights
          </div>
        </div>
        <button
          onClick={onGoToSummary}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold rounded-lg transition shadow-md hover:shadow-lg"
        >
          Open Students List
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-4 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">
            Class Summary
          </p>
          <p className="text-2xl font-black mt-1">
            {className}-{section}
          </p>
          <p className="text-sm text-indigo-100 mt-1 font-semibold">
            {summaryMetrics.totalStudents} students
          </p>
        </div>
        <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-4 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-100">
            Average Attendance
          </p>
          <p className="text-2xl font-black mt-1">
            {summaryMetrics.averageAttendance}%
          </p>
          <p className="text-sm text-cyan-100 mt-1 font-semibold">Across class records</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">
            Average Marks
          </p>
          <p className="text-2xl font-black mt-1">
            {summaryMetrics.averageMarks}%
          </p>
          <p className="text-sm text-emerald-100 mt-1 font-semibold">All submitted marks</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white p-4 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition">
          <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-100">
            Top Performer
          </p>
          <p className="text-base font-black mt-1 truncate">{insightMetrics.topStudentName}</p>
          <p className="text-sm text-fuchsia-100 mt-1 font-semibold">{insightMetrics.topStudentScore}% score</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-white p-4 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-100">
            At-Risk Students
          </p>
          <p className="text-2xl font-black mt-1">{insightMetrics.atRiskCount}</p>
          <p className="text-sm text-rose-100 mt-1 font-semibold">Below 50% average</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-blue-400/30 bg-slate-900/80 p-4 shadow-xl hover:shadow-2xl transition">
          <h3 className="text-sm font-bold text-blue-100 mb-3">Daily Class Attendance (%)</h3>
          <div className="h-64 w-full min-w-0">
            {attendanceTrendData.length === 0 ? (
              <div className="h-full grid place-items-center text-sm text-slate-400">No attendance trend data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={220}>
                <LineChart data={attendanceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="dayLabel"
                    stroke="#94a3b8"
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value) => [`${value}%`, "Attendance"]}
                    labelFormatter={(_, payload) => `${payload?.[0]?.payload?.dayLabel || ""} (${payload?.[0]?.payload?.dateLabel || ""})`}
                  />
                  <Legend wrapperStyle={{ color: "#cbd5e1" }} />
                  <Line type="monotone" dataKey="percentage" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: "#1d4ed8" }} name="Attendance %" >
                    <LabelList dataKey="percentage" position="top" fill="#bfdbfe" fontSize={11} formatter={(v) => `${v}%`} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-purple-400/30 bg-slate-900/80 p-4 shadow-xl hover:shadow-2xl transition">
          <h3 className="text-sm font-bold text-purple-100 mb-3">Marks Distribution Chart</h3>
          <div className="h-64 w-full min-w-0">
            {marksRows.length === 0 ? (
              <div className="h-full grid place-items-center text-sm text-slate-400">No marks data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={220}>
                <BarChart data={marksDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value) => [`${value}`, "Students"]}
                    labelFormatter={(label) => `${label} - student count in this grade range`}
                  />
                  <Legend wrapperStyle={{ color: "#cbd5e1" }} />
                  <Bar dataKey="count" fill="#7c3aed" name="Students" radius={[8, 8, 0, 0]}>
                    <LabelList dataKey="count" position="top" fill="#e2e8f0" fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-400/30 bg-slate-900/80 p-4 shadow-xl hover:shadow-2xl transition lg:col-span-2">
          <h3 className="text-sm font-bold text-emerald-100 mb-3">Subject Performance Chart (%)</h3>
          <div className="h-64 w-full min-w-0">
            {classPerformanceData.length === 0 ? (
              <div className="h-full grid place-items-center text-sm text-slate-400">No subject performance data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={220}>
                <AreaChart data={classPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="subject" stroke="#94a3b8" />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ color: "#cbd5e1" }} />
                  <Area type="monotone" dataKey="average" stroke="#059669" fill="#6ee7b7" fillOpacity={0.45} name="Avg Marks %" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-950/70 to-slate-900 p-4 shadow-xl lg:col-span-2">
          <h3 className="text-sm font-bold text-amber-100 mb-3">Students Needing Attention</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-300 border-b border-slate-700">
                  <th className="px-3 py-2 text-left">Student</th>
                  <th className="px-3 py-2 text-right">Attendance</th>
                  <th className="px-3 py-2 text-right">Avg Marks</th>
                  <th className="px-3 py-2 text-left">Issue</th>
                </tr>
              </thead>
              <tbody>
                {studentsNeedingAttention.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-center text-emerald-300">
                      No students currently flagged.
                    </td>
                  </tr>
                ) : (
                  studentsNeedingAttention.map((row) => (
                    <tr key={row.id} className="border-b border-slate-800">
                      <td className="px-3 py-2 text-slate-100 font-semibold">{row.name}</td>
                      <td className="px-3 py-2 text-right text-cyan-300">{row.attendance}%</td>
                      <td className="px-3 py-2 text-right text-fuchsia-300">{row.avgMarks}%</td>
                      <td className="px-3 py-2 text-amber-200">{row.issue}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-950/70 to-slate-900 p-4 shadow-xl">
          <h3 className="text-sm font-bold text-emerald-100 mb-3">Top Performing Students</h3>
          {performanceLists.top.length === 0 ? (
            <p className="text-sm text-emerald-300">No marks data available</p>
          ) : (
            <ul className="space-y-2">
              {performanceLists.top.map((student, idx) => (
                <li key={student.id} className="flex items-center justify-between rounded-lg bg-slate-900/70 border border-emerald-400/20 px-3 py-2">
                  <span className="text-sm font-semibold text-emerald-50">
                    {idx + 1}. {student.name}
                  </span>
                  <span className="text-sm font-bold text-emerald-300">{student.average}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-rose-400/30 bg-gradient-to-br from-rose-950/70 to-slate-900 p-4 shadow-xl">
          <h3 className="text-sm font-bold text-rose-100 mb-3">Weak Students List</h3>
          {performanceLists.weak.length === 0 ? (
            <p className="text-sm text-rose-300">No weak students identified</p>
          ) : (
            <ul className="space-y-2">
              {performanceLists.weak.map((student) => (
                <li key={student.id} className="flex items-center justify-between rounded-lg bg-slate-900/70 border border-rose-400/20 px-3 py-2">
                  <span className="text-sm font-semibold text-rose-50">{student.name}</span>
                  <span className="text-sm font-bold text-rose-300">{student.average}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
