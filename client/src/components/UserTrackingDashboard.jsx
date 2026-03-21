import { useCallback, useState, useEffect } from "react";
import { useToast } from "./ToastProvider";
import StatCard from "./common/StatCard";

export default function UserTrackingDashboard({ token }) {
  const API_URL = import.meta.env.VITE_API_URL;
  const toast = useToast();

  const [concurrentUsers, setConcurrentUsers] = useState([]);
  const [dailyStats, setDailyStats] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [filterRole, setFilterRole] = useState("all");

  const fetchTrackingData = useCallback(async () => {
    try {
      const [concurrentRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/tracking/concurrent-users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(
          `${API_URL}/api/tracking/daily-stats?date=${selectedDate}&role=${filterRole}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
      ]);

      console.log('📊 Tracking Dashboard: Received responses -', {
        concurrent: concurrentRes.status,
        daily: statsRes.status,
      });

      if (!concurrentRes.ok || !statsRes.ok) {
        console.error('❌ Tracking Dashboard: Response error -', {
          concurrent: concurrentRes.status,
          daily: statsRes.status,
        });
        throw new Error("Failed to fetch tracking data");
      }

      const concurrentData = await concurrentRes.json();
      const statsData = await statsRes.json();

      console.log('📊 Tracking Dashboard: Data received -', {
        concurrent: concurrentData.length || 0,
        daily: statsData.sessions?.length || 0,
      });

      setConcurrentUsers(Array.isArray(concurrentData) ? concurrentData : []);
      setDailyStats(Array.isArray(statsData.sessions) ? statsData.sessions : []);
    } catch (err) {
      console.error('❌ Tracking Dashboard Error:', err);
      toast.error("Failed to load tracking data");
    }
  }, [API_URL, filterRole, selectedDate, toast, token]);

  // Fetch concurrent users and daily stats
  useEffect(() => {
    fetchTrackingData();
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchTrackingData, 30000);
    return () => clearInterval(interval);
  }, [fetchTrackingData]);

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-700";
      case "TEACHER":
        return "bg-blue-100 text-blue-700";
      case "STUDENT":
        return "bg-emerald-100 text-emerald-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">👥 User Tracking Dashboard</h2>
        <p className="text-blue-100">
          Monitor concurrent users and track user activity duration
        </p>
      </div>

      {/* Concurrent Users Section */}
      <div className="bg-slate-900/70 border border-white/10 rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">🟢 Active Now</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Users" value={concurrentUsers.length} icon="👤" color="text-blue-400" />
          <StatCard title="Admins" value={concurrentUsers.filter((u) => u.role === "ADMIN").length} icon="🛡️" color="text-cyan-300" />
          <StatCard title="Teachers" value={concurrentUsers.filter((u) => u.role === "TEACHER").length} icon="🎓" color="text-purple-300" />
          <StatCard title="Students" value={concurrentUsers.filter((u) => u.role === "STUDENT").length} icon="📚" color="text-amber-300" />
        </div>

        {concurrentUsers.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>📭 No active users right now</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                    Login Time
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                {concurrentUsers.map((user, idx) => {
                  const duration = Math.floor(
                    (Date.now() - new Date(user.loginTime).getTime()) / 1000
                  );
                  const userName = user.userName || "Unknown User";
                  return (
                    <tr
                      key={idx}
                      className="border-b border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-900">{userName}</div>
                        <div className="text-xs text-slate-500 mt-1">ID: {user.userId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatTime(user.loginTime)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-blue-600">
                        {formatDuration(duration)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Daily Statistics Section */}
      <div className="bg-slate-900/70 border border-white/10 rounded-2xl shadow-lg p-6">
        <div className="flex items-center flex-wrap gap-4 justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">📊 Daily Activity</h3>
          <div className="flex gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 rounded-lg border border-white/15 bg-white/5 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 rounded-lg border border-white/15 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="TEACHER">Teacher</option>
              <option value="STUDENT">Student</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        {dailyStats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Sessions" value={dailyStats.length} icon="🗂️" color="text-blue-300" />
            <StatCard
              title="Avg Duration"
              value={formatDuration(
                Math.floor(
                  dailyStats.reduce((sum, s) => sum + (s.duration || 0), 0) /
                    dailyStats.length
                )
              )}
              icon="⏱️"
              color="text-emerald-300"
            />
            <StatCard
              title="Total Time"
              value={formatDuration(
                dailyStats.reduce((sum, s) => sum + (s.duration || 0), 0)
              )}
              icon="⌛"
              color="text-purple-300"
            />
            <StatCard
              title="Peak Hours"
              value={
                dailyStats.length > 0
                  ? Math.max(...dailyStats.map((s) => s.concurrentCount || 0))
                  : 0
              }
              icon="📈"
              color="text-orange-300"
            />
          </div>
        )}

        {/* Daily Activity Table */}
        {dailyStats.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p>📭 No activity recorded for {selectedDate}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                    Login Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                    Logout Time
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                {dailyStats.map((session, idx) => {
                  const userName = session.userName || "Unknown User";
                  return (
                    <tr
                      key={idx}
                      className="border-b border-slate-100 hover:bg-slate-50 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-900">{userName}</div>
                        <div className="text-xs text-slate-500 mt-1">ID: {session.userId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(
                            session.role
                          )}`}
                        >
                          {session.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatTime(session.loginTime)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {session.logoutTime
                          ? formatTime(session.logoutTime)
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-blue-600">
                        {formatDuration(session.duration || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
