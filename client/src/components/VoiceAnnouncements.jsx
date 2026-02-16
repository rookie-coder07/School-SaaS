import { useState, useEffect } from "react";
import { useToast } from "./ToastProvider";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * VoiceAnnouncements Component
 * Displays a list of voice announcements with audio playback
 * 
 * Props:
 * - endpoint: API endpoint to fetch announcements from (e.g., "/api/teacher/voice-announces")
 * - title: Section title (e.g., "School Announcements")
 * - icon: Icon emoji (e.g., "🎙️")
 * - emptyMessage: Message when no announcements (e.g., "No announcements yet")
 */
export default function VoiceAnnouncements({
  endpoint,
  title = "School Announcements",
  icon = "🎙️",
  emptyMessage = "No announcements yet",
}) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playingId, setPlayingId] = useState(null);
  const toast = useToast();

  // Get the correct token based on what the endpoint expects
  // This is determined by the API endpoint path
  const getToken = () => {
    if (endpoint.includes("/admin/")) {
      return localStorage.getItem("adminToken");
    } else if (endpoint.includes("/teacher/")) {
      return localStorage.getItem("teacherToken");
    } else if (endpoint.includes("/student/")) {
      return localStorage.getItem("studentToken");
    }
    // Fallback (shouldn't happen)
    return localStorage.getItem("adminToken") || localStorage.getItem("teacherToken") || localStorage.getItem("studentToken");
  };

  const token = getToken();

  // Fetch announcements on mount
  useEffect(() => {
    fetchAnnouncements();
  }, [endpoint]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError("");

      let tokenType = "unknown";
      if (endpoint.includes("/admin/")) {
        tokenType = "admin";
      } else if (endpoint.includes("/teacher/")) {
        tokenType = "teacher";
      } else if (endpoint.includes("/student/")) {
        tokenType = "student";
      }

      console.log(`🔍 Fetching announcements...`);
      console.log(`   Endpoint: ${endpoint}`);
      console.log(`   Full URL: ${API_URL}${endpoint}`);
      console.log(`   Token type: ${tokenType}`);
      console.log(`   Token present: ${!!token}`);
      if (!token) {
        console.warn(`   ⚠️ NO TOKEN FOUND for ${tokenType}`);
      }

      const res = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`❌ Fetch failed: ${res.status} ${res.statusText}`);
        console.error(`   Response: ${errorText}`);
        throw new Error(`Failed to fetch announcements (${res.status} ${res.statusText})`);
      }

      const data = await res.json();
      console.log(`✅ Loaded ${data.length} announcements from ${endpoint}`);
      data.forEach((ann, idx) => {
        console.log(`   [${idx + 1}] ${ann.title} - Audio URL: ${API_URL}${ann.audioUrl}`);
      });
      setAnnouncements(data || []);
    } catch (err) {
      console.error("❌ FETCH ANNOUNCEMENTS ERROR:", err);
      console.error(`   Endpoint: ${API_URL}${endpoint}`);
      console.error(`   Token present: ${!!token}`);
      setError(err.message);
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">{icon} {title}</h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-xl border border-red-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">{icon} {title}</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">{icon} {title}</h2>
        <div className="text-center py-12">
          <p className="text-slate-500 text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <h2 className="text-lg font-bold text-slate-900">{icon} {title}</h2>

      <div className="space-y-3">
        {announcements.map((announcement) => (
          <div
            key={announcement._id}
            className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">
                  {announcement.title || "School Announcement"}
                </h3>
                <p className="text-xs text-slate-500">
                  {announcement.senderType && `From: ${announcement.senderName} (${announcement.senderType})`}
                  {!announcement.senderType && `From: ${announcement.senderName || "Admin"}`}
                  {" • "}
                  {announcement.createdAtFormatted}
                </p>
              </div>
            </div>

            {/* Audio Player */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPlayingId(playingId === announcement._id ? null : announcement._id)}
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  playingId === announcement._id
                    ? "bg-blue-100 text-blue-600"
                    : "bg-slate-100 text-slate-600 hover:bg-blue-100"
                }`}
                title={playingId === announcement._id ? "Pause" : "Play"}
              >
                {playingId === announcement._id ? "⏸️" : "▶️"}
              </button>

              <div className="flex-1">
                <audio
                  key={`${announcement._id}-audio`}
                  controls
                  className="w-full h-8"
                  onPlay={() => setPlayingId(announcement._id)}
                  onPause={() => setPlayingId(null)}
                  onEnded={() => setPlayingId(null)}
                  onError={(e) => {
                    console.error(`❌ Audio failed to load for announcement ${announcement._id}:`, e);
                    console.error(`   URL attempted: ${API_URL}${announcement.audioUrl}`);
                  }}
                >
                  <source src={`${API_URL}${announcement.audioUrl}`} type="audio/webm" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
