import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, ScatterChart, Scatter } from "recharts";
import { useToast } from "../components/ToastProvider";

export default function StudentAnalyticsDashboard() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = localStorage.getItem("teacherToken");
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (!studentId) {
      setError("Student ID not found");
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        console.log("Fetching analytics for student:", studentId);
        console.log("Token available:", !!token);
        
        const res = await fetch(`${API_URL}/api/teacher/students/${studentId}/analytics`, {
          method: "GET",
          headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        });

        console.log("Response status:", res.status);

        if (!res.ok) {
          let errorMsg = `HTTP ${res.status}: `;
          try {
            const errorData = await res.json();
            errorMsg += errorData.error || errorData.message || "Failed to fetch analytics";
            console.error("Error response:", errorData);
          } catch {
            errorMsg += res.statusText || "Failed to fetch analytics";
          }
          throw new Error(errorMsg);
        }

        const data = await res.json();
        console.log("Analytics data received:", data);
        setAnalytics(data);
        setError(null);
      } catch (err) {
        console.error("Analytics error:", err);
        setError(err.message || "Failed to load analytics");
        toast.error(err.message || "Failed to load student analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [studentId, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-600 mt-4">Loading student analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-900 font-semibold">Error: {error || "Analytics data not available"}</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { student, attendance, marks, riskIndicators, suggestions } = analytics;

  // Prepare chart data
  const examTrendData = marks.examTrends || [];
  const subjectBenchmarkData = (marks.subjects || []).map(s => ({
    name: s.subject,
    average: s.average,
    highest: s.highest,
    lowest: s.lowest,
  }));

  const attendanceDistribution = [
    { name: "Present", value: attendance.present, color: "#10b981" },
    { name: "Absent", value: attendance.absent, color: "#ef4444" },
  ];

  // Color coding for KPIs
  const getAttendanceColor = (percentage) => {
    if (percentage >= 80) return "from-green-50 to-green-100 border-green-200 text-green-900";
    if (percentage >= 60) return "from-amber-50 to-amber-100 border-amber-200 text-amber-900";
    return "from-red-50 to-red-100 border-red-200 text-red-900";
  };

  const getMarksColor = (average) => {
    if (average >= 80) return "from-blue-50 to-blue-100 border-blue-200 text-blue-900";
    if (average >= 60) return "from-purple-50 to-purple-100 border-purple-200 text-purple-900";
    return "from-orange-50 to-orange-100 border-orange-200 text-orange-900";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4 sm:p-6 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header with Story */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-300 hover:text-blue-200 font-semibold text-sm mb-4 flex items-center transition"
          >
            ← Back to Dashboard
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-5xl font-black text-white mb-2">{student.name}'s Learning Profile</h1>
              <p className="text-blue-200 text-base font-semibold">Class {student.class} • Section {student.section} • Analyzing growth & potential 📊</p>
            </div>
            <div className="text-right bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
              <p className="text-blue-100 text-sm">Roll No: <span className="font-bold text-white">{student.rollNo}</span></p>
              <p className="text-blue-100 text-sm">Email: <span className="font-semibold">{student.email}</span></p>
            </div>
          </div>
        </div>

        {/* KPI Cards - Modern Glassmorphism */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Attendance % */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-xl transition hover:shadow-2xl hover:scale-105 transform hover:bg-white/15">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-bold text-blue-200 uppercase tracking-widest">Attendance</div>
                <div className="text-4xl font-black text-white mt-3">{attendance.percentage}%</div>
                <div className="text-xs text-blue-100 mt-3 font-medium">{attendance.present} Present / {attendance.total} Days</div>
              </div>
              <div className="text-4xl">{attendance.percentage >= 80 ? '⭐' : attendance.percentage >= 60 ? '⚡' : '⚠️'}</div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs font-semibold text-blue-100">{attendance.percentage >= 80 ? '🎯 Excellent!' : attendance.percentage >= 60 ? '📈 Improving' : '🚨 Focus needed'}</p>
            </div>
          </div>

          {/* Overall Average Marks */}
          <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-xl transition hover:shadow-2xl hover:scale-105 transform hover:from-pink-500/30 hover:to-purple-500/30">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-bold text-pink-200 uppercase tracking-widest">Overall Performance</div>
                <div className="text-4xl font-black text-white mt-3">{marks.overallAverage}</div>
                <div className="text-xs text-pink-100 mt-3 font-medium">Out of 100 • {marks.totalExams} exams</div>
              </div>
              <div className="text-4xl">{marks.overallAverage >= 80 ? '🏆' : marks.overallAverage >= 60 ? '📚' : '🎓'}</div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs font-semibold text-pink-100">{marks.overallAverage >= 80 ? '✅ Outstanding!' : marks.overallAverage >= 60 ? '✔️ Good' : '📖 Keep going'}</p>
            </div>
          </div>

          {/* Best Subject */}
          <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-xl transition hover:shadow-2xl hover:scale-105 transform hover:from-emerald-500/30 hover:to-teal-500/30">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-bold text-emerald-200 uppercase tracking-widest">Your Strength</div>
                <div className="text-2xl font-black text-white mt-3">{marks.bestSubject?.subject || "—"}</div>
                <div className="text-xs text-emerald-100 mt-3 font-medium">Avg: {marks.bestSubject?.average || 0}/100</div>
              </div>
              <div className="text-4xl">🌟</div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs font-semibold text-emerald-100">💪 Your best subject!</p>
            </div>
          </div>

          {/* Weakest Subject */}
          <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-xl transition hover:shadow-2xl hover:scale-105 transform hover:from-orange-500/30 hover:to-red-500/30">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-bold text-orange-200 uppercase tracking-widest">Growth Area</div>
                <div className="text-2xl font-black text-white mt-3">{marks.weakestSubject?.subject || "—"}</div>
                <div className="text-xs text-orange-100 mt-3 font-medium">Avg: {marks.weakestSubject?.average || 0}/100</div>
              </div>
              <div className="text-4xl">🎯</div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs font-semibold text-orange-100">📝 Opportunity zone</p>
            </div>
          </div>
        </div>

        {/* Charts Section - Data Story */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-1">📊 Performance Analytics</h2>
          <p className="text-blue-200 text-sm mb-6">Dive deep into your learning patterns and discover insights</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Exam Performance Trend - Modern Area Chart */}
          {examTrendData.length > 0 && (
            <div className="bg-blue-500/20 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📈</span>
                <div>
                  <h3 className="text-base font-bold text-white">Your Growth Journey</h3>
                  <p className="text-xs text-blue-200">How your marks improved over exams</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={examTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
                  <defs>
                    <linearGradient id="colorAverage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="exam" tick={{ fontSize: 11, fill: '#cbd5e1' }} angle={-30} textAnchor="end" height={60} stroke="rgba(255,255,255,0.1)" />
                  <YAxis domain={[0, 100]} tick={{ fill: '#cbd5e1' }} stroke="rgba(255,255,255,0.1)" />
                  <Tooltip 
                    formatter={(value) => `${value}/100`}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="average" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorAverage)" 
                    dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7, strokeWidth: 2 }}
                    name="Average Marks" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Subject Performance - Gradient Bar Chart */}
          {subjectBenchmarkData.length > 0 && (
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📚</span>
                <div>
                  <h3 className="text-base font-bold text-white">Subject Performance</h3>
                  <p className="text-xs text-blue-200">Your score in each subject</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={subjectBenchmarkData} margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
                  <defs>
                    <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#cbd5e1' }} angle={-30} textAnchor="end" height={60} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#cbd5e1' }} label={{ value: 'Score', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    formatter={(value) => `${value}/100`}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="average" fill="url(#barGrad1)" radius={[12, 12, 0, 0]} name="Average Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Attendance Distribution */}
          <div className="bg-emerald-500/20 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🎯</span>
              <div>
                <h3 className="text-base font-bold text-white">Attendance Record</h3>
                <p className="text-xs text-emerald-200">Your presence and engagement</p>
              </div>
            </div>
            {attendance.total > 0 ? (
              <div className="flex flex-col items-center justify-center py-4">
                {/* Modern Circular Progress Visualization */}
                <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                    {/* Background Circle */}
                    <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                    {/* Attendance Progress */}
                    <circle 
                      cx="100" cy="100" r="90" 
                      fill="none" 
                      stroke="url(#attendanceGrad)" 
                      strokeWidth="8"
                      strokeDasharray={`${(attendance.present / attendance.total) * 565.5} 565.5`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="attendanceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                  </svg>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-4xl font-black text-white">{attendance.percentage}%</div>
                    <div className="text-xs text-emerald-200 font-semibold">Present</div>
                  </div>
                </div>

                {/* Stats Below */}
                <div className="grid grid-cols-2 gap-4 w-full text-center">
                  <div className="bg-gradient-to-br from-emerald-500/30 to-teal-500/30 rounded-lg p-4 border border-emerald-300/50 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-emerald-300">{attendance.present}</div>
                    <div className="text-xs text-emerald-200 font-semibold">Days Present</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-500/30 to-rose-500/30 rounded-lg p-4 border border-red-300/50 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-red-300">{attendance.absent}</div>
                    <div className="text-xs text-red-200 font-semibold">Days Absent</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500">No attendance data available</div>
            )}
          </div>

          {/* Subject Details Table */}
          {subjectBenchmarkData.length > 0 && (
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📖</span>
                <div>
                  <h3 className="text-base font-bold text-white">Detailed Subject Analysis</h3>
                  <p className="text-xs text-blue-200">Best, average, and lowest scores by subject</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-blue-100">Subject</th>
                      <th className="px-3 py-2 text-right font-semibold text-blue-100">Avg</th>
                      <th className="px-3 py-2 text-right font-semibold text-blue-100">Best</th>
                      <th className="px-3 py-2 text-right font-semibold text-blue-100">Low</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectBenchmarkData.map((subject, idx) => (
                      <tr key={idx} className="border-b border-white/10 hover:bg-white/5">
                        <td className="px-3 py-2 text-blue-100 font-semibold">{subject.name}</td>
                        <td className="px-3 py-2 text-right font-bold text-white">{subject.average}</td>
                        <td className="px-3 py-2 text-right text-emerald-300">{subject.highest}</td>
                        <td className="px-3 py-2 text-right text-orange-300">{subject.lowest}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Subject-Wise Insights Section */}
        {subjectBenchmarkData.length > 0 && (
          <div className="mt-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">🔍 Subject-Wise Deep Dive</h2>
            <p className="text-blue-200 text-sm mb-6">Personalized insights for each subject to guide your improvement</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectBenchmarkData.map((subject, idx) => {
                const performanceGap = 100 - subject.average;
                const consistency = subject.highest - subject.lowest;
                const isStrong = subject.average >= 75;
                const needsHelp = subject.average < 60;
                
                return (
                  <div key={idx} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">{subject.name}</h3>
                      <div className="text-3xl font-black text-blue-300">{subject.average}</div>
                    </div>
                    
                    {/* Performance Indicator */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-blue-200 font-semibold">Performance</span>
                        <span className="text-xs text-blue-100">{isStrong ? '⭐ Strong' : needsHelp ? '⚠️ Needs Help' : '📈 Good'}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            isStrong ? 'bg-emerald-500' : needsHelp ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(subject.average, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Insights */}
                    <div className="space-y-2 text-xs">
                      <div className="bg-white/5 rounded-lg p-2">
                        <p className="text-blue-100">
                          {isStrong 
                            ? `🌟 Excellent performance! Your ${subject.average}/100 average shows strong mastery. Focus on maintaining this standard.`
                            : needsHelp
                            ? `⚠️ This subject needs immediate attention. With ${subject.average}/100, prioritize dedicated study sessions and seek extra help.`
                            : `📚 You're doing okay in ${subject.name}. Aim to improve from ${subject.average} to 75+ for stronger performance.`
                          }
                        </p>
                      </div>
                      <div className="flex gap-2 justify-between">
                        <span className="bg-emerald-500/30 px-2 py-1 rounded text-emerald-200 flex-1 text-center">Best: {subject.highest}</span>
                        <span className="bg-orange-500/30 px-2 py-1 rounded text-orange-200 flex-1 text-center">Low: {subject.lowest}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Risk Indicators & Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Risk Indicators - Enhanced Storytelling */}
          {riskIndicators.length > 0 && (
            <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-400 rounded-full opacity-20 -mr-10 -mt-10 blur-3xl"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="text-4xl">🚨</div>
                  <div>
                    <h3 className="text-lg font-bold text-red-200">Areas of Attention</h3>
                    <p className="text-xs text-red-100/80">Things to work on for improvement</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {riskIndicators.map((indicator, idx) => (
                    <div key={idx} className="bg-white/10 backdrop-blur rounded-lg p-3 border-l-4 border-red-400 hover:shadow-md transition">
                      <div className="flex items-start gap-2">
                        <span className="text-lg mt-0.5">⚡</span>
                        <p className="text-sm font-semibold text-red-100">{indicator}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Insights & Suggestions - Story Driven */}
          <div className="bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-500/20 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-400 rounded-full opacity-20 -mr-10 -mt-10 blur-3xl"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-5">
                <div className="text-4xl">✨</div>
                <div>
                  <h3 className="text-lg font-bold text-cyan-200">Your Learning Journey</h3>
                  <p className="text-xs text-cyan-100/80">Personalized insights & actionable tips</p>
                </div>
              </div>
              <div className="space-y-3">
                {suggestions.length > 0 ? (
                  suggestions.map((suggestion, idx) => (
                    <div key={idx} className="bg-white/10 backdrop-blur rounded-lg p-3 border-l-4 border-cyan-400 hover:shadow-md transition">
                      <div className="flex items-start gap-2">
                        <span className="text-lg mt-0.5">💡</span>
                        <p className="text-sm font-semibold text-cyan-100">{suggestion}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white/10 backdrop-blur rounded-lg p-4 border-l-4 border-emerald-400 text-center">
                    <p className="text-sm font-semibold text-emerald-200">🌟 You're doing great! Keep up the momentum!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Motivational Section */}
        <div className="mt-8 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-2xl shadow-2xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-black/20 to-black/40 p-8 backdrop-blur-sm">
            <div className="flex items-start gap-6">
              <div className="text-6xl">🎯</div>
              <div>
                <h2 className="text-3xl font-black text-white mb-3">Your Success Story Starts Here</h2>
                <p className="text-yellow-50 text-base leading-relaxed mb-4 font-semibold">
                  Every exceptional student shares one trait: they recognize their potential and take action. Based on your data, you have what it takes to excel. The path to success is clear:
                </p>
                <ul className="text-yellow-50 text-sm space-y-1 mb-4">
                  <li>✅ Master your growth areas with focused practice</li>
                  <li>✅ Maintain momentum in your strong subjects</li>
                  <li>✅ Seek support when you need it</li>
                  <li>✅ Celebrate every milestone</li>
                </ul>
                <div className="flex gap-2 flex-wrap">
                  <span className="px-4 py-2 bg-white/20 backdrop-blur rounded-full text-sm font-bold text-white hover:bg-white/30 transition">📈 Keep Improving</span>
                  <span className="px-4 py-2 bg-white/20 backdrop-blur rounded-full text-sm font-bold text-white hover:bg-white/30 transition">🎓 Stay Focused</span>
                  <span className="px-4 py-2 bg-white/20 backdrop-blur rounded-full text-sm font-bold text-white hover:bg-white/30 transition">⭐ Achieve Excellence</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Empty Attendance Alert */}
        {attendance.total === 0 && (
          <div className="mt-8 bg-amber-500/30 backdrop-blur-xl border border-amber-300/50 rounded-2xl p-6 text-center">
            <p className="text-amber-100 font-semibold">No attendance records available yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
