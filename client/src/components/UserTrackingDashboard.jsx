import { useCallback, useState, useEffect } from "react";
import { useToast } from "./ToastProvider";

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
      <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">🟢 Active Now</h3>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">
              {concurrentUsers.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">concurrent users</p>
          </div>
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
      <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900">📊 Daily Activity</h3>
          <div className="flex gap-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
              <div className="text-xs font-semibold text-blue-700 uppercase">
                Total Sessions
              </div>
              <div className="text-3xl font-bold text-blue-900 mt-2">
                {dailyStats.length}
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-6">
              <div className="text-xs font-semibold text-emerald-700 uppercase">
                Avg Duration
              </div>
              <div className="text-3xl font-bold text-emerald-900 mt-2">
                {formatDuration(
                  Math.floor(
                    dailyStats.reduce((sum, s) => sum + (s.duration || 0), 0) /
                      dailyStats.length
                  )
                )}
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-6">
              <div className="text-xs font-semibold text-purple-700 uppercase">
                Total Time
              </div>
              <div className="text-3xl font-bold text-purple-900 mt-2">
                {formatDuration(
                  dailyStats.reduce((sum, s) => sum + (s.duration || 0), 0)
                )}
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6">
              <div className="text-xs font-semibold text-orange-700 uppercase">
                Peak Hours
              </div>
              <div className="text-3xl font-bold text-orange-900 mt-2">
                {dailyStats.length > 0
                  ? Math.max(...dailyStats.map((s) => s.concurrentCount || 0))
                  : 0}
              </div>
            </div>
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

