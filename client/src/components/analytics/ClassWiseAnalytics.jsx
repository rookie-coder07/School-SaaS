import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import './glassmorphism.css';

/**
 * ClassWiseAnalytics Component
 * 
 * Displays class-level analytics with:
 * - Performance metrics per class
 * - Attendance vs Grades heatmap
 * - Risk identification
 * - Class trends and patterns
 */
export default function ClassWiseAnalytics({ data = [] }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [sortBy, setSortBy] = useState('avgGrade');

  // Sort classes
  const sortedClasses = [...data].sort((a, b) => {
    if (sortBy === 'avgGrade') return parseFloat(b.avgGrade) - parseFloat(a.avgGrade);
    if (sortBy === 'avgAttendance') return b.avgAttendance - a.avgAttendance;
    if (sortBy === 'riskStudents') return b.riskStudents - a.riskStudents;
    return 0;
  });

  // Prepare chart data
  const classChartData = sortedClasses.map(cls => ({
    name: `${cls.class}-${cls.section}`,
    attendance: Math.round(cls.avgAttendance),
    grade: Math.round(parseFloat(cls.avgGrade)),
    students: cls.students.length,
  }));

  const getRiskColor = (riskCount, studentCount) => {
    const riskPercentage = (riskCount / studentCount) * 100;
    if (riskPercentage > 40) return 'bg-red-500/20 border-red-500/50';
    if (riskPercentage > 20) return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-green-500/20 border-green-500/50';
  };

  const getPerformanceGrade = (attendance, grade) => {
    const combined = (attendance * 0.3 + grade * 0.7) / 100;
    if (combined >= 0.8) return { letter: 'A', color: 'text-green-400' };
    if (combined >= 0.7) return { letter: 'B', color: 'text-blue-400' };
    if (combined >= 0.6) return { letter: 'C', color: 'text-yellow-400' };
    return { letter: 'D', color: 'text-red-400' };
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="space-y-8">
      {/* Header with Sort Controls */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center flex-wrap gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">📊 Class Performance Overview</h2>
          <p className="text-slate-400">Analyzing {data.length} classes across your school</p>
        </div>
        
        <div className="flex gap-3">
          {[
            { value: 'avgGrade', label: '📈 By Grade' },
            { value: 'avgAttendance', label: '📍 By Attendance' },
            { value: 'riskStudents', label: '⚠️ By Risk' },
          ].map((opt) => (
            <motion.button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                sortBy === opt.value
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="analytics-grid"
      >
        {[
          {
            icon: '🎓',
            label: 'Avg Grade',
            value: (
              data.reduce((sum, c) => sum + parseFloat(c.avgGrade), 0) / data.length
            ).toFixed(1),
            change: '+2.5%',
          },
          {
            icon: '📍',
            label: 'Avg Attendance',
            value: Math.round(data.reduce((sum, c) => sum + c.avgAttendance, 0) / data.length) + '%',
            change: '+1.2%',
          },
          {
            icon: '⚠️',
            label: 'At-Risk Students',
            value: data.reduce((sum, c) => sum + c.riskStudents, 0),
            change: '-5%',
          },
          {
            icon: '👥',
            label: 'Total Students',
            value: data.reduce((sum, c) => sum + c.students.length, 0),
            change: 'stable',
          },
        ].map((metric, idx) => (
          <motion.div
            key={idx}
            variants={item}
            className="metric-card with-glow-cyan"
          >
            <span className="metric-icon">{metric.icon}</span>
            <span className="metric-label">{metric.label}</span>
            <span className="metric-value">{metric.value}</span>
            <span className={`metric-change ${metric.change.includes('-') ? 'negative' : 'positive'}`}>
              {metric.change.includes('-') ? '📉' : '📈'} {metric.change}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="analytics-row"
      >
        {/* Grade vs Attendance Chart */}
        <div className="chart-container">
          <div className="chart-title">
            <span className="chart-icon">📊</span> Grade vs Attendance by Class
          </div>
          <ResponsiveContainer width="100%" height="calc(100% - 50px)">
            <LineChart data={classChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis dataKey="name" stroke="rgba(148, 163, 184, 0.5)" />
              <YAxis stroke="rgba(148, 163, 184, 0.5)" />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: '8px',
                }}
                cursor={{ stroke: 'rgba(6, 182, 212, 0.3)' }}
              />
              <Legend />
              <Line type="monotone" dataKey="grade" stroke="#06b6d4" strokeWidth={3} name="Avg Grade" />
              <Line type="monotone" dataKey="attendance" stroke="#ec4899" strokeWidth={3} name="Attendance %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Class Size Distribution */}
        <div className="chart-container">
          <div className="chart-title">
            <span className="chart-icon">👥</span> Class Size Distribution
          </div>
          <ResponsiveContainer width="100%" height="calc(100% - 50px)">
            <BarChart data={classChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis dataKey="name" stroke="rgba(148, 163, 184, 0.5)" />
              <YAxis stroke="rgba(148, 163, 184, 0.5)" />
              <Tooltip
                contentStyle={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="students" fill="#06b6d4" radius={[8, 8, 0, 0]} name="Students" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Class Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <h3 className="text-lg font-bold text-white">🎓 Class Details</h3>
        
        {sortedClasses.map((classData, idx) => {
          const perfGrade = getPerformanceGrade(classData.avgAttendance, parseFloat(classData.avgGrade));
          const riskColor = getRiskColor(classData.riskStudents, classData.students.length);

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + idx * 0.05 }}
              onClick={() => setSelectedClass(selectedClass === idx ? null : idx)}
              className={`glassmorphic-card cursor-pointer hover:elevated transition-all ${riskColor}`}
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <h4 className="text-lg font-bold text-white">
                      Class {classData.class} - {classData.section}
                    </h4>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${perfGrade.color}`}>
                      Grade: {perfGrade.letter}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-slate-400 uppercase font-semibold">Average Grade</div>
                      <div className="text-xl font-bold text-cyan-400">{classData.avgGrade}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 uppercase font-semibold">Attendance</div>
                      <div className="text-xl font-bold text-magenta-400">{classData.avgAttendance.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 uppercase font-semibold">Total Students</div>
                      <div className="text-xl font-bold text-green-400">{classData.students.length}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 uppercase font-semibold">At-Risk</div>
                      <div className="text-xl font-bold text-red-400">{classData.riskStudents}</div>
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex flex-col items-center gap-2">
                  {classData.riskStudents === 0 ? (
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  ) : classData.riskStudents > classData.students.length * 0.3 ? (
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  ) : (
                    <TrendingUp className="w-8 h-8 text-yellow-400" />
                  )}
                  <span className="text-xs text-slate-400">
                    {((classData.riskStudents / classData.students.length) * 100).toFixed(0)}% risk
                  </span>
                </div>
              </div>

              {/* Insight Text */}
              {selectedClass === idx && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-slate-600"
                >
                  <p className="text-sm text-slate-300">
                    {classData.avgGrade >= 70 && classData.avgAttendance >= 80
                      ? '✨ Excellent performance! This class shows strong commitment with high grades and regular attendance.'
                      : classData.riskStudents > 0
                      ? `⚠️ ${classData.riskStudents} student(s) need attention. Consider focused intervention programs.`
                      : '📈 Good progress! Continue monitoring and provide support where needed.'}
                  </p>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
