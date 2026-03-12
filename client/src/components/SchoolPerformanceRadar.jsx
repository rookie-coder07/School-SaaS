import React, { useState, useEffect, useMemo, memo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, Award, AlertCircle, Filter } from 'lucide-react';
const API_URL = import.meta.env.VITE_API_URL;
const SchoolPerformanceRadar = memo(({ token, schoolId }) => {
  const [classComparison, setClassComparison] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  
  // New state for fetched classes and sections
  const [metaClasses, setMetaClasses] = useState([]);
  const [metaSections, setMetaSections] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState('');
  
  // State for students list
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState('');
  // Fetch unique classes and sections from meta endpoint
  useEffect(() => {
    const fetchClassesAndSections = async () => {
      try {
        setMetaLoading(true);
        setMetaError('');
        console.log('🔄 FETCHING: Classes and sections metadata...');
        const response = await fetch(`${API_URL}/api/admin/meta/classes-sections`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('📋 META RESPONSE: Status', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ META API RETURNED:', data);
        
        setMetaClasses(data.classes || []);
        setMetaSections(data.sections || []);
        
        if (!data.hasData) {
          setMetaError('No classes or sections found. Please add students first.');
        }
      } catch (error) {
        console.error('❌ Error fetching classes and sections:', error);
        setMetaError('Failed to load classes and sections');
        setMetaClasses([]);
        setMetaSections([]);
      } finally {
        setMetaLoading(false);
      }
    };
    if (token && schoolId) {
      fetchClassesAndSections();
    }
  }, [token, schoolId]);
  // Fetch class comparison data
  useEffect(() => {
    const fetchClassComparison = async () => {
      try {
        setLoading(true);
        
        // Build URL with query parameters
        let url = `${API_URL}/api/admin/analytics/class-comparison`;
        const params = new URLSearchParams();
        if (selectedClass) params.append('class', selectedClass);
        if (selectedSection) params.append('section', selectedSection);
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
        
        console.log('🔄 FETCHING: Class comparison data from:', url);
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('📋 RESPONSE: Status', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✅ API RETURNED:', result);
        
        // Handle both old format (array) and new format (object with data/summary)
        let classData = [];
        if (Array.isArray(result)) {
          // Old format - backward compatibility
          classData = result;
        } else if (result.data && Array.isArray(result.data)) {
          // New format with summary
          classData = result.data;
          console.log('📊 SUMMARY:', result.summary);
        } else {
          console.warn('⚠️ Unexpected response format:', result);
          classData = [];
        }
        
        console.log(`📊 Total classes: ${classData.length}`);
        if (classData.length > 0) {
          const uniqueClasses = [...new Set(classData.map(c => String(c.class)))];
          const uniqueSections = [...new Set(classData.map(c => String(c.section)))];
          console.log('🎯 Unique classes:', uniqueClasses);
          console.log('📌 Unique sections:', uniqueSections);
        }
        
        setClassComparison(classData);
      } catch (error) {
        console.error('❌ Error fetching class comparison:', error);
        setClassComparison([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (token && schoolId) {
      fetchClassComparison();
    }
  }, [token, schoolId, selectedClass, selectedSection]);
  // Fetch students when class and section are selected
  useEffect(() => {
    const fetchStudents = async () => {
      // Only fetch if both class and section are selected (not "All")
      if (!selectedClass || !selectedSection) {
        setStudents([]);
        setStudentsError('');
        return;
      }
      try {
        setStudentsLoading(true);
        setStudentsError('');
        console.log(`🔍 FETCHING: Students for class=${selectedClass}, section=${selectedSection}`);
        const response = await fetch(
          `${API_URL}/api/admin/students-by-class?class=${selectedClass}&section=${selectedSection}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`✅ API RETURNED ${data.count} students:`, data.students);
        setStudents(data.students || []);
        
        if (data.count === 0) {
          setStudentsError('No students found for this class and section');
        }
      } catch (error) {
        console.error('❌ Error fetching students:', error);
        setStudentsError('Failed to load students');
        setStudents([]);
      } finally {
        setStudentsLoading(false);
      }
    };
    if (token) {
      fetchStudents();
    }
  }, [selectedClass, selectedSection, token]);
  // Get unique classes and sections from fetched data (not from analytics data)
  const { uniqueClasses, uniqueSections } = useMemo(() => {
    console.log('📊 USING FETCHED CLASSES:', metaClasses);
    console.log('📊 USING FETCHED SECTIONS:', metaSections);
    return { uniqueClasses: metaClasses, uniqueSections: metaSections };
  }, [metaClasses, metaSections]);
  // Filter classes based on selection
  const filteredClasses = useMemo(() => {
    return classComparison.filter(c => {
      const classMatch = !selectedClass || c.class === selectedClass;
      const sectionMatch = !selectedSection || c.section === selectedSection;
      return classMatch && sectionMatch;
    });
  }, [classComparison, selectedClass, selectedSection]);
  // Chart data for bar chart comparison
  const barChartData = useMemo(() => {
    return filteredClasses.map(c => ({
      name: `${c.class}-${c.section}`,
      'Engagement %': c.avgAttendancePercent,
      'Marks %': c.avgMarksPercent,
    })).slice(0, 15); // Limit to 15 classes for readability
  }, [filteredClasses]);
  // Radar chart data
  const radarChartData = useMemo(() => {
    return filteredClasses.slice(0, 6).map(c => ({
      name: `${c.class}-${c.section}`,
      'Attendance': c.avgAttendancePercent,
      'Marks': c.avgMarksPercent,
      fullMark: 100,
    }));
  }, [filteredClasses]);
  // Top performer
  const topPerformer = useMemo(() => {
    return filteredClasses.length > 0 ? filteredClasses[0] : null;
  }, [filteredClasses]);
  // At-risk classes (attendance < 70 or marks < 50)
  const atRiskClasses = useMemo(() => {
    return filteredClasses.filter(c => c.avgAttendancePercent < 70 || c.avgMarksPercent < 50).slice(0, 5);
  }, [filteredClasses]);
  // Statistics
  const stats = useMemo(() => {
    if (filteredClasses.length === 0) return { avgAttendance: 0, avgMarks: 0, excellentCount: 0 };
    
    const avgAttendance = Math.round(
      filteredClasses.reduce((sum, c) => sum + c.avgAttendancePercent, 0) / filteredClasses.length
    );
    const avgMarks = Math.round(
      filteredClasses.reduce((sum, c) => sum + c.avgMarksPercent, 0) / filteredClasses.length
    );
    const excellentCount = filteredClasses.filter(c => c.overall === 'Excellent').length;
    return { avgAttendance, avgMarks, excellentCount };
  }, [filteredClasses]);
  const getCategoryColor = (overall) => {
    switch (overall) {
      case 'Excellent': return 'bg-gradient-to-br from-emerald-50 to-teal-100 border border-emerald-200 shadow-sm';
      case 'Good': return 'bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 shadow-sm';
      default: return 'bg-gradient-to-br from-orange-50 to-red-100 border border-orange-200 shadow-sm';
    }
  };
  const getCategoryBgColor = (overall) => {
    switch (overall) {
      case 'Excellent': return 'bg-green-500';
      case 'Good': return 'bg-blue-500';
      default: return 'bg-orange-500';
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4 sm:p-6 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-2000"></div>
      </div>
      
      <div className="max-w-6xl mx-auto relative z-10 space-y-6">
      {/* Header - Responsive */}
      <div className="mb-6 sm:mb-8 text-center md:text-left">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 md:mb-3">🎯 School Performance Radar</h1>
        <p className="text-blue-200 text-sm sm:text-base font-semibold">Comprehensive class comparison and performance analytics</p>
      </div>
      
      {/* GLOBAL LOADING STATE - Responsive */}
      {loading && classComparison.length === 0 && (
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 sm:p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-10 sm:w-12 h-10 sm:h-12 border-4 border-slate-400 border-t-blue-400 rounded-full animate-spin" />
          </div>
          <p className="text-white font-medium text-sm sm:text-base">Analyzing school performance...</p>
          <p className="text-blue-200 text-xs sm:text-sm mt-2">Aggregating attendance and marks data</p>
        </div>
      )}
      
      {/* GLOBAL ERROR/EMPTY STATE - Responsive */}
      {!loading && classComparison.length === 0 && (
        <div className="bg-blue-500/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 sm:p-8 border-l-4 border-blue-400">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <AlertCircle className="w-6 sm:w-8 h-6 sm:h-8 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="w-full">
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">📊 No Analytics Data Available</h3>
              <div className="text-blue-200 text-xs sm:text-sm space-y-2">
                <p className="font-medium">💡 To view analytics, you need:</p>
                <ul className="list-disc list-inside ml-2 space-y-0.5">
                  <li>Students enrolled in your school</li>
                  <li>Attendance records marked for classes</li>
                  <li>Marks/grades assigned to students</li>
                </ul>
                <p className="mt-3 font-medium">Next Steps:</p>
                <ol className="list-decimal list-inside ml-2 space-y-0.5">
                  <li>Add students to classes and sections</li>
                  <li>Record attendance for student sessions</li>
                  <li>Enter marks for academic subjects</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Filter Section - Responsive */}
      {!loading && classComparison.length > 0 && (
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-white/20">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">Performance Filters</h2>
          </div>
          
          {/* Meta Error Message */}
          {metaError && (
            <div className="mb-4 p-4 bg-red-500/20 backdrop-blur-xl border border-white/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-200">{metaError}</p>
              </div>
            </div>
          )}
          
          {/* Meta Loading State */}
          {metaLoading ? (
            <div className="flex items-center justify-center h-20 bg-white/5 rounded-lg">
              <p className="text-blue-200 text-sm">Loading filters...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-blue-200 mb-2">Class</label>
                {uniqueClasses.length > 0 ? (
                  <select 
                    value={selectedClass} 
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white bg-slate-800/50 backdrop-blur-sm text-sm"
                  >
                    <option value="">All Classes</option>
                    {uniqueClasses.map(cls => (
                      <option key={cls} value={cls}>Class {cls}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-white/20 rounded-lg bg-white/5 text-slate-400 text-sm">
                    No classes found
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-blue-200 mb-2">Section</label>
                {uniqueSections.length > 0 ? (
                  <select 
                    value={selectedSection} 
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-white bg-slate-800/50 backdrop-blur-sm text-sm"
                  >
                    <option value="">All Sections</option>
                    {uniqueSections.map(sec => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-white/20 rounded-lg bg-white/5 text-slate-400 text-sm">
                    No sections found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {/* Statistics Cards - KPI - Responsive & Premium */}
      {!loading && classComparison.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Avg Attendance */}
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/20 backdrop-blur-xl border border-white/20 p-4 sm:p-5 md:p-6 rounded-2xl hover:border-white/40 transition-all hover:shadow-lg hover:shadow-blue-500/20">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-blue-200 uppercase tracking-widest">Attendance</div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white mt-2 md:mt-3">{stats.avgAttendance}%</div>
                <div className="text-xs text-blue-300 mt-1 md:mt-2 font-medium">All classes</div>
              </div>
              <div className="text-2xl sm:text-3xl md:text-4xl flex-shrink-0">{stats.avgAttendance >= 80 ? '⭐' : stats.avgAttendance >= 70 ? '⚡' : '⚠️'}</div>
            </div>
          </div>

          {/* Avg Marks */}
          <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 backdrop-blur-xl border border-white/20 p-4 sm:p-5 md:p-6 rounded-2xl hover:border-white/40 transition-all hover:shadow-lg hover:shadow-pink-500/20">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-pink-200 uppercase tracking-widest">Performance</div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white mt-2 md:mt-3">{stats.avgMarks}%</div>
                <div className="text-xs text-pink-300 mt-1 md:mt-2 font-medium">Overall</div>
              </div>
              <div className="text-2xl sm:text-3xl md:text-4xl flex-shrink-0">{stats.avgMarks >= 80 ? '🏆' : stats.avgMarks >= 60 ? '📚' : '🎓'}</div>
            </div>
          </div>

          {/* Excellent Count */}
          <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur-xl border border-white/20 p-4 sm:p-5 md:p-6 rounded-2xl hover:border-white/40 transition-all hover:shadow-lg hover:shadow-emerald-500/20">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-emerald-200 uppercase tracking-widest">Strength</div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white mt-2 md:mt-3">{stats.excellentCount}</div>
                <div className="text-xs text-emerald-300 mt-1 md:mt-2 font-medium">Excellent</div>
              </div>
              <div className="text-2xl sm:text-3xl md:text-4xl flex-shrink-0">🌟</div>
            </div>
          </div>

          {/* Total Classes */}
          <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-xl border border-white/20 p-4 sm:p-5 md:p-6 rounded-2xl hover:border-white/40 transition-all hover:shadow-lg hover:shadow-orange-500/20">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-orange-200 uppercase tracking-widest">Data Points</div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-black text-white mt-2 md:mt-3">{filteredClasses.length}</div>
                <div className="text-xs text-orange-300 mt-1 md:mt-2 font-medium">Analyzed</div>
              </div>
              <div className="text-2xl sm:text-3xl md:text-4xl flex-shrink-0">📊</div>
            </div>
          </div>
        </div>
      )}
      {/* Top Performer - Responsive */}
      {!loading && classComparison.length > 0 && topPerformer && (
        <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-white/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-emerald-100 mb-1 flex items-center gap-2">🏆 Top Performer</h3>
              <p className="text-xl sm:text-2xl font-black text-white break-words">
                Class {topPerformer.class} - Section {topPerformer.section}
              </p>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4">
                <div>
                  <p className="text-xs font-semibold text-emerald-300 uppercase tracking-tight">Students</p>
                  <p className="text-lg sm:text-xl font-bold text-white mt-1">{topPerformer.totalStudents}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-300 uppercase tracking-tight">Attendance</p>
                  <p className="text-lg sm:text-xl font-bold text-white mt-1">{topPerformer.avgAttendancePercent}%</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-300 uppercase tracking-tight">Marks</p>
                  <p className="text-lg sm:text-xl font-bold text-white mt-1">{topPerformer.avgMarksPercent}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Comparison Charts - Responsive */}
      {!loading && filteredClasses.length > 0 && (
        <>
          {/* Bar Chart - Attendance vs Marks */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
              <span className="text-2xl">📈</span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm sm:text-base font-bold text-white">Performance Comparison</h4>
                <p className="text-xs text-blue-200">Attendance vs marks by class</p>
              </div>
            </div>
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={300} minWidth={280}>
                <BarChart data={barChartData} margin={{ top: 20, right: 20, left: -20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10, fill: '#cbd5e1' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#cbd5e1' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Engagement %" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="Marks %" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Radar Chart (if less than 7 classes) - Responsive */}
          {filteredClasses.length < 7 && (
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
                <span className="text-2xl">🎯</span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm sm:text-base font-bold text-white">Performance Radar</h4>
                  <p className="text-xs text-blue-200">Multi-dimensional class analysis</p>
                </div>
              </div>
              <div className="w-full overflow-x-auto">
                <ResponsiveContainer width="100%" height={300} minWidth={280}>
                  <RadarChart data={radarChartData}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: '#cbd5e1' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#cbd5e1' }} />
                    <Radar name="Attendance" dataKey="Attendance" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    <Radar name="Marks" dataKey="Marks" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
      {/* Class Cards Grid - Responsive */}
      {!loading && (
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white mb-4">📋 Class Performance Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredClasses.map((classData, idx) => (
              <div 
                key={idx} 
                className={`rounded-2xl p-4 sm:p-5 border backdrop-blur-xl transition-all hover:bg-white/[0.15] active:bg-white/[0.12] ${getCategoryColor(classData.overall)}`}
              >
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xl sm:text-2xl font-black text-white">
                      {classData.class}-{classData.section}
                    </p>
                    <p className="text-xs font-semibold text-blue-300 mt-1">{classData.totalStudents} Students</p>
                  </div>
                  <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap flex-shrink-0 ${getCategoryBgColor(classData.overall)}`}>
                    {classData.overall}
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-blue-200 font-semibold uppercase">Attendance</span>
                      <span className="text-xs text-blue-300 flex-shrink-0">{classData.avgAttendancePercent >= 75 ? '⭐ Strong' : classData.avgAttendancePercent >= 60 ? '📈 Good' : '⚠️ Needs'}</span>
                    </div>
                    <div className="w-full bg-slate-700/40 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          classData.avgAttendancePercent >= 75 ? 'bg-emerald-500' : classData.avgAttendancePercent >= 60 ? 'bg-blue-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${Math.min(classData.avgAttendancePercent, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-blue-200 font-semibold uppercase">Marks</span>
                      <span className="text-xs text-blue-300 flex-shrink-0">{classData.avgMarksPercent >= 75 ? '⭐ Strong' : classData.avgMarksPercent >= 60 ? '📚 Good' : '🎓 Fair'}</span>
                    </div>
                    <div className="w-full bg-slate-700/40 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          classData.avgMarksPercent >= 75 ? 'bg-emerald-500' : classData.avgMarksPercent >= 60 ? 'bg-blue-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${Math.min(classData.avgMarksPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10">
                    <div>
                      <p className="text-xs font-semibold text-blue-200 uppercase">Best</p>
                      <p className="text-sm font-bold text-emerald-400 truncate">{classData.topSubject}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-blue-200 uppercase">Needs</p>
                      <p className="text-sm font-bold text-orange-400 truncate">{classData.weakestSubject}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* At-Risk Classes Alert - Responsive */}
      {!loading && atRiskClasses.length > 0 && (
        <div className="bg-red-500/20 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4">
            <div className="text-3xl sm:text-4xl flex-shrink-0">🚨</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base sm:text-lg font-bold text-red-200">Areas of Attention</h4>
              <p className="text-xs sm:text-sm text-red-300">Classes requiring intervention</p>
            </div>
          </div>
          <div className="space-y-2">
            {atRiskClasses.map((classData, idx) => (
              <div key={idx} className="bg-white/10 rounded-lg p-3 sm:p-4 border-l-4 border-red-400 hover:bg-white/[0.12] transition-colors">
                <div className="flex items-start gap-2 sm:gap-3">
                  <span className="text-lg sm:text-xl mt-0.5 flex-shrink-0">⚡</span>
                  <p className="text-xs sm:text-sm font-semibold text-red-200 break-words">
                    Class {classData.class}-{classData.section}
                    {classData.avgAttendancePercent < 70 && ` • Attendance: ${classData.avgAttendancePercent}%`}
                    {classData.avgMarksPercent < 50 && ` • Marks: ${classData.avgMarksPercent}%`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Students List Section - Responsive */}
      {selectedClass && selectedSection && (
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-white/20">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">👥</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">Students in Class {selectedClass}-{selectedSection}</h3>
              <p className="text-xs text-blue-200">Complete class roster</p>
            </div>
          </div>
          
          {/* Students Loading */}
          {studentsLoading && (
            <div className="flex items-center justify-center h-20 bg-white/5 rounded-lg">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-slate-400 border-t-blue-400 rounded-full animate-spin mb-2 mx-auto" />
                <p className="text-blue-200 text-xs sm:text-sm">Loading students...</p>
              </div>
            </div>
          )}
          
          {/* Students Error */}
          {!studentsLoading && studentsError && (
            <div className="p-4 bg-orange-500/20 border border-white/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-orange-200">{studentsError}</p>
            </div>
          )}
          
          {/* Students Table */}
          {!studentsLoading && students.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-bold text-blue-100 text-xs sm:text-sm">Roll No</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 text-left font-bold text-blue-100 text-xs sm:text-sm">Name</th>
                    <th className="hidden sm:table-cell px-3 sm:px-4 py-2 sm:py-3 text-left font-bold text-blue-100 text-xs sm:text-sm">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => (
                    <tr key={student._id || idx} className="border-b border-white/10 hover:bg-white/5">
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-blue-100 font-medium text-xs sm:text-sm">{student.rollNo}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-slate-100 text-xs sm:text-sm">{student.name}</td>
                      <td className="hidden sm:table-cell px-3 sm:px-4 py-2 sm:py-3 text-slate-400 text-xs">{student.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-blue-300 mt-3">Total: {students.length} students</p>
            </div>
          )}
        </div>
      )}
      {/* Loading State - Responsive */}
      {loading && (
        <div className="flex items-center justify-center min-h-[24rem] sm:min-h-[26rem] bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
          <div className="text-center px-4">
            <div className="w-10 sm:w-12 h-10 sm:h-12 border-4 border-slate-400 border-t-blue-400 rounded-full animate-spin mb-4 mx-auto" />
            <p className="text-white font-medium text-sm sm:text-base">Loading class performance data...</p>
          </div>
        </div>
      )}
      {/* Empty State - Responsive */}
      {!loading && filteredClasses.length === 0 && (
        <div className="flex items-center justify-center min-h-[24rem] sm:min-h-[26rem] bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
          <div className="text-center px-4">
            <p className="text-blue-200 font-medium text-sm sm:text-base">No classes found for the selected filters</p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
});
SchoolPerformanceRadar.displayName = 'SchoolPerformanceRadar';
export default SchoolPerformanceRadar;

