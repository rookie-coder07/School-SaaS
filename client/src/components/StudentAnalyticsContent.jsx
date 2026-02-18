import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function StudentAnalyticsContent({ analytics, loading, error }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-600 mt-4">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-900 font-semibold">Error: {error || "Analytics data not available"}</p>
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

  return (
    <div className="space-y-6">
      {/* KPI Cards - Modern Glassmorphism */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance % */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-6 rounded-2xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-bold text-blue-700 uppercase tracking-widest">Attendance</div>
              <div className="text-4xl font-black text-blue-900 mt-3">{attendance.percentage}%</div>
              <div className="text-xs text-blue-700 mt-3 font-medium">{attendance.present} Present / {attendance.total} Days</div>
            </div>
            <div className="text-4xl">{attendance.percentage >= 80 ? '⭐' : attendance.percentage >= 60 ? '⚡' : '⚠️'}</div>
          </div>
        </div>

        {/* Overall Average Marks */}
        <div className="bg-gradient-to-br from-pink-50 to-purple-100 border border-pink-200 p-6 rounded-2xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-bold text-pink-700 uppercase tracking-widest">Performance</div>
              <div className="text-4xl font-black text-purple-900 mt-3">{marks.overallAverage}</div>
              <div className="text-xs text-pink-700 mt-3 font-medium">Out of 100 • {marks.totalExams} exams</div>
            </div>
            <div className="text-4xl">{marks.overallAverage >= 80 ? '🏆' : marks.overallAverage >= 60 ? '📚' : '🎓'}</div>
          </div>
        </div>

        {/* Best Subject */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-100 border border-emerald-200 p-6 rounded-2xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Strength</div>
              <div className="text-2xl font-black text-emerald-900 mt-3">{marks.bestSubject?.subject || "—"}</div>
              <div className="text-xs text-emerald-700 mt-3 font-medium">Avg: {marks.bestSubject?.average || 0}/100</div>
            </div>
            <div className="text-4xl">🌟</div>
          </div>
        </div>

        {/* Weakest Subject */}
        <div className="bg-gradient-to-br from-orange-50 to-red-100 border border-orange-200 p-6 rounded-2xl shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-bold text-orange-700 uppercase tracking-widest">Growth Area</div>
              <div className="text-2xl font-black text-orange-900 mt-3">{marks.weakestSubject?.subject || "—"}</div>
              <div className="text-xs text-orange-700 mt-3 font-medium">Avg: {marks.weakestSubject?.average || 0}/100</div>
            </div>
            <div className="text-4xl">🎯</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4">📊 Performance Analytics</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Exam Performance Trend */}
          {examTrendData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📈</span>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Your Growth Journey</h4>
                  <p className="text-xs text-slate-500">How your marks improved over exams</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={examTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
                  <defs>
                    <linearGradient id="colorAverage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" vertical={false} />
                  <XAxis dataKey="exam" tick={{ fontSize: 11, fill: '#64748b' }} angle={-30} textAnchor="end" height={60} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b' }} />
                  <Tooltip 
                    formatter={(value) => `${value}/100`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="average" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorAverage)" 
                    dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                    name="Average Marks" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Subject Performance */}
          {subjectBenchmarkData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📚</span>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Subject Performance</h4>
                  <p className="text-xs text-slate-500">Your score in each subject</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectBenchmarkData} margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
                  <defs>
                    <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} angle={-30} textAnchor="end" height={60} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b' }} />
                  <Tooltip 
                    formatter={(value) => `${value}/100`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Bar dataKey="average" fill="url(#barGrad1)" radius={[12, 12, 0, 0]} name="Average Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Subject Details Table */}
          {subjectBenchmarkData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📖</span>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Detailed Subject Analysis</h4>
                  <p className="text-xs text-slate-500">Best, average, and lowest scores by subject</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Subject</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Avg</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Best</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Low</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectBenchmarkData.map((subject, idx) => (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-700 font-semibold">{subject.name}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">{subject.average}</td>
                        <td className="px-3 py-2 text-right text-emerald-600">{subject.highest}</td>
                        <td className="px-3 py-2 text-right text-orange-600">{subject.lowest}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subject-Wise Insights */}
      {subjectBenchmarkData.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4">🔍 Subject-Wise Deep Dive</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectBenchmarkData.map((subject, idx) => {
              const isStrong = subject.average >= 75;
              const needsHelp = subject.average < 60;
              
              return (
                <div key={idx} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-lg font-bold text-slate-900">{subject.name}</h5>
                    <div className="text-3xl font-black text-blue-600">{subject.average}</div>
                  </div>
                  
                  {/* Performance Indicator */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-600 font-semibold">Performance</span>
                      <span className="text-xs text-slate-500">{isStrong ? '⭐ Strong' : needsHelp ? '⚠️ Needs Help' : '📈 Good'}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
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
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-slate-700">
                        {isStrong 
                          ? `🌟 Excellent performance! Your ${subject.average}/100 average shows strong mastery.`
                          : needsHelp
                          ? `⚠️ This subject needs attention. With ${subject.average}/100, prioritize practice.`
                          : `📚 You're doing okay in ${subject.name}. Aim to improve to 75+ for better performance.`
                        }
                      </p>
                    </div>
                    <div className="flex gap-2 justify-between">
                      <span className="bg-emerald-50 px-2 py-1 rounded text-emerald-700 flex-1 text-center">Best: {subject.highest}</span>
                      <span className="bg-orange-50 px-2 py-1 rounded text-orange-700 flex-1 text-center">Low: {subject.lowest}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Risk Indicators & Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Indicators */}
        {riskIndicators.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">🚨</div>
              <div>
                <h4 className="text-lg font-bold text-red-900">Areas of Attention</h4>
                <p className="text-xs text-red-700">Things to work on</p>
              </div>
            </div>
            <div className="space-y-3">
              {riskIndicators.map((indicator, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 border-l-4 border-red-400">
                  <div className="flex items-start gap-2">
                    <span className="text-lg mt-0.5">⚡</span>
                    <p className="text-sm font-semibold text-red-900">{indicator}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        <div className="bg-cyan-50 border border-cyan-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-4xl">✨</div>
            <div>
              <h4 className="text-lg font-bold text-cyan-900">Your Learning Journey</h4>
              <p className="text-xs text-cyan-700">Personalized insights</p>
            </div>
          </div>
          <div className="space-y-3">
            {suggestions.length > 0 ? (
              suggestions.map((suggestion, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 border-l-4 border-cyan-400">
                  <div className="flex items-start gap-2">
                    <span className="text-lg mt-0.5">💡</span>
                    <p className="text-sm font-semibold text-cyan-900">{suggestion}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg p-4 border-l-4 border-emerald-400 text-center">
                <p className="text-sm font-semibold text-emerald-700">🌟 You're doing great! Keep up the momentum!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
