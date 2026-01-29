import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function TeacherLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
  e.preventDefault();
  setLoading(true);

  try {
    const res = await fetch(
      "http://localhost:5000/api/auth/teacher/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Login failed");
      return;
    }

    localStorage.setItem("teacherToken", data.token);
    localStorage.setItem(
      "teacherData",
      JSON.stringify({
        class: data.class,
        section: data.section,
      })
    );

    navigate("/teacher/dashboard");
  } catch (err) {
    alert("Backend not reachable");
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 rounded shadow w-96 space-y-4"
      >
        <h1 className="text-2xl font-bold text-center">Teacher Login</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border p-2 rounded"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border p-2 rounded"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
