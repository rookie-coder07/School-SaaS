import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function DeveloperLogin() {
  console.log("✅ DeveloperLogin component mounted");
  
  const [email, setEmail] = useState("developer@example.com");
  const [password, setPassword] = useState("developer123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Use environment variable with fallback to localhost for development
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const endpoint = `${API_URL}/api/auth/developer/login`;
      
      console.log("📤 Attempting developer login...");
      console.log("   API_URL:", API_URL);
      console.log("   Endpoint:", endpoint);
      console.log("   Email:", email);
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      console.log("📥 Server response - Status:", res.status);
      
      const data = await res.json();
      console.log("📦 Response data:", data);
      
      if (!res.ok) {
        const errorMsg = data.error || "Login failed";
        console.error("❌ LOGIN FAILED:", errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      if (!data.token) {
        console.error("❌ NO TOKEN IN RESPONSE");
        setError("Server error: No token received");
        setLoading(false);
        return;
      }

      console.log("✅ Token received, saving to localStorage...");
      localStorage.setItem("developerToken", data.token);
      console.log("✅ Token saved. Navigating to /dev...");
      navigate("/dev");
    } catch (err) {
      console.error("❌ LOGIN ERROR:", err);
      setError(err.message || "Connection error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-slate-50 px-4 py-8 font-sans">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-lg space-y-4"
      >
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Developer Login
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-2 font-medium">
            Sign in to your account
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-semibold">
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 text-sm md:text-base mt-6"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
