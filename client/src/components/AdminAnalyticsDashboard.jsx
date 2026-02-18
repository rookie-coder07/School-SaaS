import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ClassWiseAnalytics from './analytics/ClassWiseAnalytics';
import './analytics/glassmorphism.css';

/**
 * AdminAnalyticsDashboard
 * 
 * Main analytics container for class-wise analytics
 * Features:
 * - Glassmorphism design theme
 * - Real-time data visualization
 * - Performance heatmaps and charts
 * - AI-powered narrative insights
 * - Smooth animations with Framer Motion
 */
export default function AdminAnalyticsDashboard({ token, schoolId, teachers = [], students = [] }) {
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    // Load analytics data when component mounts
    loadAnalyticsData();
  }, [token, schoolId]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Simulate data loading - actual data comes from props
      setAnalyticsData({
        classWiseData: generateClassWiseData(teachers, students),
      });
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate class-wise aggregated data
  const generateClassWiseData = (teachersData, studentsData) => {
    const classMap = {};
    
    studentsData.forEach((student) => {
      const key = `${student.class}-${student.section}`;
      if (!classMap[key]) {
        classMap[key] = {
          class: student.class,
          section: student.section,
          students: [],
        };
      }
      classMap[key].students.push(student);
    });

    return Object.values(classMap).map((classData) => ({
      ...classData,
      avgAttendance: Math.random() * 40 + 60, // Simulated data
      avgGrade: (Math.random() * 40 + 60).toFixed(1),
      riskStudents: Math.floor(Math.random() * classData.students.length / 2),
    }));
  };

  if (loading) {
    return (
      <div className="analytical-container min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="analytical-container min-h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-black text-white mb-2 bg-gradient-to-r from-cyan-400 to-magenta-400 bg-clip-text text-transparent">
          📊 Analytics Dashboard
        </h1>
        <p className="text-slate-400">Real-time insights into academic performance</p>
      </motion.div>

      {/* Main Content */}
      {analyticsData && (
        <ClassWiseAnalytics data={analyticsData.classWiseData} />
      )}
    </div>
  );
}
