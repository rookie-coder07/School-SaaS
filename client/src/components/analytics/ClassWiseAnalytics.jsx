import React, { useState, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import './glassmorphism.css';

void motion;

/**
 * ClassWiseAnalytics Component - OPTIMIZED
 * 
 * Displays class-level analytics with:
 * - Performance metrics per class
 * - At-risk students list
 * - Attendance vs Grades trend
 * - Performance insights
 * 
 * Optimizations:
 * - useMemo for expensive calculations
 * - Memoized components
 * - Single efficient chart
 */
const ClassWiseAnalytics = memo(function ClassWiseAnalytics({ data = [] }) {
  const [sortBy, setSortBy] = useState('avgGrade');
  const [expandedClass, setExpandedClass] = useState(null);

  // Memoized sorted classes
  const sortedClasses = useMemo(() => {
    return [...data].sort((a, b) => {
      if (sortBy === 'avgGrade') return parseFloat(b.avgGrade) - parseFloat(a.avgGrade);
      if (sortBy === 'avgAttendance') return b.avgAttendance - a.avgAttendance;
      if (sortBy === 'riskStudents') return b.riskStudents - a.riskStudents;
      return 0;
    });
  }, [data, sortBy]);

  // Memoized chart data
  const classChartData = useMemo(() => {
    return sortedClasses.map(cls => ({
      name: `${cls.class}-${cls.section}`,
      attendance: Math.round(cls.avgAttendance),
      grade: Math.round(parseFloat(cls.avgGrade)),
    }));
  }, [sortedClasses]);

  // Memoized at-risk students list
  const atRiskStudents = useMemo(() => {
    const allAtRisk = [];
    sortedClasses.forEach(cls => {
      if (cls.students && cls.students.length > 0) {
        const atRisk = cls.students.filter(s => 
          (s.attendance || 0) < 70 || (s.grade || 0) < 60
        ).slice(0, 5); // Limit to 5 per class
        atRisk.forEach(s => allAtRisk.push({ ...s, className: `${cls.class}-${cls.section}` }));
      }
    });
    return allAtRisk.sort((a, b) => ((a.attendance || 0) - (b.attendance || 0))).slice(0, 10); // Top 10
  }, [sortedClasses]);

  const getRiskColor = (riskCount, studentCount) => {
    const riskPercentage = (riskCount / studentCount) * 100;
    if (riskPercentage > 40) return 'bg-red-50 border-red-200';
    if (riskPercentage > 20) return 'bg-yellow-50 border-yellow-200';
    return 'bg-green-50 border-green-200';
  };

  const getPerformanceGrade = (attendance, grade) => {
    const combined = (attendance * 0.3 + grade * 0.7) / 100;
    if (combined >= 0.8) return { letter: 'A', color: 'text-green-600', bg: 'bg-green-100' };
    if (combined >= 0.7) return { letter: 'B', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (combined >= 0.6) return { letter: 'C', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { letter: 'D', color: 'text-red-600', bg: 'bg-red-100' };
  };

  // Memoized metrics
  const metrics = useMemo(() => {
    if (data.length === 0) return [];
    return [
      {
        icon: '🎓',
        label: 'Avg Grade',
        value: (data.reduce((sum, c) => sum + parseFloat(c.avgGrade), 0) / data.length).toFixed(1),
      },
      {
        icon: '📍',
        label: 'Avg Attendance',
        value: Math.round(data.reduce((sum, c) => sum + c.avgAttendance, 0) / data.length) + '%',
      },
      {
        icon: '⚠️',
        label: 'At-Risk Students',
        value: data.reduce((sum, c) => sum + c.riskStudents, 0),
      },
      {
        icon: '👥',
        label: 'Total Students',
        value: data.reduce((sum, c) => sum + c.students.length, 0),
      },
    ];
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center flex-wrap gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">📊 Class Performance</h2>
          <p className="text-slate-600">Overview of {data.length} classes</p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'avgGrade', label: '📈 Grade' },
            { value: 'avgAttendance', label: '📍 Attendance' },
            { value: 'riskStudents', label: '⚠️ Risk' },
          ].map((opt) => (
            <motion.button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                sortBy === opt.value
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {opt.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {metrics.map((metric, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -5 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 shadow-sm"
          >
            <span className="text-3xl block mb-2">{metric.icon}</span>
            <span className="text-xs text-slate-600 font-semibold block">{metric.label}</span>
            <span className="text-2xl font-bold text-slate-800">{metric.value}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Attendance vs Grade Chart */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-6 rounded-2xl bg-white border-2 border-slate-200 shadow-sm"
      >
        <h3 className="text-lg font-bold text-slate-800 mb-4">📈 Performance Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={classChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
            <XAxis dataKey="name" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip
              contentStyle={{
                background: 'rgba(255, 255, 255, 0.95)',
                border: '2px solid #3b82f6',
                borderRadius: '12px',
                color: '#1e293b',
              }}
              cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
            />
            <Legend />
            <Line type="monotone" dataKey="grade" stroke="#3b82f6" strokeWidth={3} name="Avg Grade" dot={{ fill: '#3b82f6', r: 5 }} />
            <Line type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={3} name="Attendance %" dot={{ fill: '#10b981', r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* At-Risk Students Section */}
      {atRiskStudents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 shadow-sm"
        >
          <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> Students Needing Attention ({atRiskStudents.length})
          </h3>
          <div className="space-y-3">
            {atRiskStudents.map((student, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.05 }}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{student.name || `Student #${idx + 1}`}</p>
                  <p className="text-sm text-slate-600">Class: {student.className}</p>
                </div>
                <div className="flex gap-4 text-sm font-semibold">
                  <span className={student.attendance < 70 ? 'text-red-600' : 'text-slate-600'}>
                    📍 {(student.attendance || 0).toFixed(0)}%
                  </span>
                  <span className={student.grade < 60 ? 'text-red-600' : 'text-slate-600'}>
                    🎓 {(student.grade || 0).toFixed(0)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Class Details */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3"
      >
        <h3 className="text-lg font-bold text-slate-800">🎓 Classes Overview</h3>
        
        {sortedClasses.map((classData, idx) => {
          const perfGrade = getPerformanceGrade(classData.avgAttendance, parseFloat(classData.avgGrade));
          const riskColor = getRiskColor(classData.riskStudents, classData.students.length);

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + idx * 0.05 }}
              onClick={() => setExpandedClass(expandedClass === idx ? null : idx)}
              className={`p-4 rounded-xl cursor-pointer border-2 transition-all ${riskColor}`}
              whileHover={{ y: -2 }}
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-base font-bold text-slate-800">Class {classData.class}-{classData.section}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${perfGrade.color} ${perfGrade.bg}`}>
                      {perfGrade.letter}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-slate-600">Grade:</span> <span className="font-bold text-blue-600">{classData.avgGrade}</span></div>
                    <div><span className="text-slate-600">Attendance:</span> <span className="font-bold text-green-600">{classData.avgAttendance.toFixed(1)}%</span></div>
                    <div><span className="text-slate-600">Students:</span> <span className="font-bold text-slate-800">{classData.students.length}</span></div>
                    <div><span className="text-slate-600">At-Risk:</span> <span className="font-bold text-red-600">{classData.riskStudents}</span></div>
                  </div>
                </div>
                {classData.riskStudents === 0 ? (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : classData.riskStudents > classData.students.length * 0.3 ? (
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                ) : (
                  <TrendingUp className="w-6 h-6 text-orange-600 flex-shrink-0" />
                )}
              </div>

              {expandedClass === idx && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t border-slate-300"
                >
                  <p className="text-sm text-slate-700">
                    {classData.avgGrade >= 70 && classData.avgAttendance >= 80
                      ? '✨ Great job! Maintain this momentum.'
                      : classData.riskStudents > 0
                      ? `⚠️ ${classData.riskStudents} student(s) need focus.`
                      : '📈 Keep improving!'}
                  </p>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
});

export default ClassWiseAnalytics;
