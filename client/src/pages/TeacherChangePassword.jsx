import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastProvider";
import PageIntro from "../components/ui/PageIntro";

const API_URL = import.meta.env.VITE_API_URL;

export default function TeacherChangePassword() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const token = localStorage.getItem("teacherToken");

  useEffect(() => {
    if (!token) navigate("/teacher/login", { replace: true });
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      toast.warning("All fields are required");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.warning("New password and confirm password must match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to change password");
        return;
      }
      localStorage.setItem("teacherMustChangePassword", "false");
      toast.success("Password changed successfully");
      navigate("/teacher/dashboard", { replace: true });
    } catch (err) {
      console.error("TEACHER CHANGE PASSWORD ERROR:", err);
      toast.error("Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-100 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-md">
        <div className="bg-white/85 backdrop-blur-md rounded-3xl border border-slate-200 shadow-md p-5 md:p-6">
          <PageIntro
            title="Change Password"
            description="For security, update your password before continuing."
            className="mb-4"
          />

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <input
              type="password"
              value={form.currentPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              placeholder="Current Password"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              placeholder="New Password"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Confirm New Password"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
