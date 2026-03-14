import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Smartphone } from "lucide-react";
import TimetableGrid from "../components/TimetableGrid";
import { ListSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ToastProvider";

const API_URL = import.meta.env.VITE_API_URL;

export default function StudentTimetablePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const tableContainerRef = useRef(null);

  // Get token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("studentToken");
    if (!storedToken) {
      toast.error("Please log in to view your timetable");
      navigate("/student/login");
      return;
    }
    setToken(storedToken);
    setLoading(false);
  }, [navigate, toast]);

  // Track screen width for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = screenWidth < 768;

  if (loading || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <ListSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/student/dashboard")}
            className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 transition duration-200"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Class Timetable</h1>
            <p className="text-sm text-slate-400 mt-1">Your complete weekly schedule</p>
          </div>
        </div>

        {/* Mobile Rotation Hint */}
        {isMobile && (
          <div className="mb-6 rounded-lg border border-blue-400/30 bg-blue-500/10 p-4 flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-400/20 flex-shrink-0">
              <Smartphone className="h-4 w-4 text-blue-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-100">Tip for Better View</h3>
              <p className="text-xs text-blue-200/80 mt-1">
                Rotate your device to landscape for a better view of your complete timetable.
              </p>
            </div>
          </div>
        )}

        {/* Horizontal Scroll Container */}
        <div className="rounded-2xl border border-white/15 bg-slate-900/45 p-6 shadow-[0_14px_34px_rgba(2,6,23,0.38)] backdrop-blur-xl overflow-hidden">
          {/* TimetableGrid with horizontal scroll capability */}
          <div style={{ overflowX: "auto", overflowY: "hidden" }}>
            <div ref={tableContainerRef} style={{ minWidth: "100%", width: isMobile ? "1200px" : "100%" }}>
              <TimetableGrid token={token} isTeacher={false} readOnly={true} theme="dark" />
            </div>
          </div>
        </div>

        {/* Mobile Instructions */}
        {isMobile && (
          <div className="mt-6 rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
            <p className="text-xs text-slate-300">
              💡 <span className="font-semibold">Swipe horizontally</span> to see more days and subjects
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
