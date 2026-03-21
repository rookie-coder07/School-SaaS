import { useNavigate } from "react-router-dom";
import { GraduationCap, Shield, Users } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

      <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-2xl border border-white/20 bg-slate-800/70 p-10 shadow-[0_25px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            EduNest
          </h1>
          <p className="mt-2 text-center text-sm text-slate-300">
            The complete digital platform for modern schools
          </p>

          <div className="mt-8 space-y-4">
            <button
              onClick={() => navigate("/student/login")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-green-500 py-4 font-semibold text-white transition-all duration-200 hover:scale-105 hover:shadow-lg"
            >
              <GraduationCap className="h-5 w-5" />
              Student Portal
            </button>
            <button
              onClick={() => navigate("/teacher/login")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-500 py-4 font-semibold text-white transition-all duration-200 hover:scale-105 hover:shadow-lg"
            >
              <Users className="h-5 w-5" />
              Teacher Portal
            </button>
            <button
              onClick={() => navigate("/admin/login")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 py-4 font-semibold text-white transition-all duration-200 hover:scale-105 hover:shadow-lg"
            >
              <Shield className="h-5 w-5" />
              Admin Console
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-slate-300/80">
            &copy; 2026 EduNest &mdash; School Management Suite
          </div>
        </div>
      </main>
    </div>
  );
}
