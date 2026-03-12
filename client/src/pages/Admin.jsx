import { useState } from "react";
import PageContainer from "../components/ui/PageContainer";
import PageIntro from "../components/ui/PageIntro";

const API_URL = import.meta.env.VITE_API_URL;

export default function Admin() {
  const [mode, setMode] = useState("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    className: "",
    section: "",
    rollNo: "",
    subject: "",
    password: "",
    parentName: "",
    phone: "",
  });

  const token = localStorage.getItem("adminToken") || localStorage.getItem("token") || "";

  const handleChange = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const endpoint = mode === "student" ? "/api/admin/add-student" : "/api/admin/add-teacher";
      const payload =
        mode === "student"
          ? {
              name: form.name,
              email: form.email,
              rollNo: form.rollNo,
              className: form.className,
              section: form.section,
              password: form.password,
              parentName: form.parentName,
              phone: form.phone,
            }
          : {
              name: form.name,
              email: form.email,
              className: form.className,
              section: form.section,
              subject: form.subject,
              password: form.password,
            };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
      } else {
        setMessage(`${mode === "student" ? "Student" : "Teacher"} created - id: ${data.userId}`);
        setForm({
          name: "",
          email: "",
          className: "",
          section: "",
          rollNo: "",
          subject: "",
          password: "",
          parentName: "",
          phone: "",
        });
      }
    } catch (err) {
      console.error("ADMIN SUBMIT ERROR:", err);
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-4">
        <PageIntro
          title={mode === "student" ? "Add Student" : "Add Teacher"}
          description="Create accounts manually (admin only)."
        />

        <div className="saas-card p-6">
          <div className="flex gap-2 mb-4">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
                mode === "student" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200"
              }`}
              onClick={() => setMode("student")}
            >
              Student
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
                mode === "teacher" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200"
              }`}
              onClick={() => setMode("teacher")}
            >
              Teacher
            </button>
          </div>

          {error && <div className="mb-3 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
          {message && <div className="mb-3 rounded-lg bg-emerald-50 text-emerald-700 px-3 py-2 text-sm">{message}</div>}

          <form onSubmit={submit} className="grid gap-3">
            <input required placeholder="Full name" value={form.name} onChange={handleChange("name")} className="saas-input" />
            <input required placeholder="Email" value={form.email} onChange={handleChange("email")} className="saas-input" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input placeholder="Class" value={form.className} onChange={handleChange("className")} className="saas-input" />
              <input placeholder="Section" value={form.section} onChange={handleChange("section")} className="saas-input" />
            </div>

            {mode === "student" && (
              <>
                <input placeholder="Roll No" value={form.rollNo} onChange={handleChange("rollNo")} className="saas-input" />
                <input placeholder="Parent Name" value={form.parentName} onChange={handleChange("parentName")} className="saas-input" />
                <input placeholder="Phone Number" value={form.phone} onChange={handleChange("phone")} className="saas-input" />
              </>
            )}

            {mode === "teacher" && (
              <input placeholder="Subject" value={form.subject} onChange={handleChange("subject")} className="saas-input" />
            )}

            <input placeholder="Password (optional)" value={form.password} onChange={handleChange("password")} className="saas-input" />

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-50">
                {loading ? "Creating..." : `Create ${mode === "student" ? "Student" : "Teacher"}`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm({ name: "", email: "", className: "", section: "", rollNo: "", subject: "", password: "", parentName: "", phone: "" });
                  setError("");
                  setMessage("");
                }}
                className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-lg font-semibold text-sm hover:bg-slate-50 transition"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageContainer>
  );
}
