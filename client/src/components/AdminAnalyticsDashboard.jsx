import React, { memo } from 'react';
import { motion } from 'framer-motion';
import './analytics/glassmorphism.css';

/**
 * AdminAnalyticsDashboard
 * 
 * Analytics section - Currently disabled
 */
const AdminAnalyticsDashboard = memo(function AdminAnalyticsDashboard({ token, schoolId, teachers = [], students = [] }) {
  return (
    <div className="min-h-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-2">
          📊 Analytics
        </h1>
        <p className="text-slate-600 text-lg">Analytics section is currently unavailable</p>
      </motion.div>
    </div>
  );
});

export default AdminAnalyticsDashboard;

