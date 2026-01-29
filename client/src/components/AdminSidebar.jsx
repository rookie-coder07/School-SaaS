import { useNavigate } from "react-router-dom";

export default function AdminSidebar() {
  const navigate = useNavigate();

  return (
    <div className="w-64 h-screen bg-slate-900 text-white fixed">
      <div className="p-6 text-xl font-bold border-b border-slate-700">
        🏫 Admin Panel
      </div>

      <div className="mt-6 flex flex-col">
        <button
          onClick={() => navigate("/admin/dashboard")}
          className="px-6 py-3 text-left hover:bg-slate-800"
        >
          Dashboard
        </button>

        <button
          onClick={() => navigate("/admin/admissions")}
          className="px-6 py-3 text-left hover:bg-slate-800"
        >
          Admissions
        </button>

        <button
          onClick={() => {
            localStorage.clear();
            navigate("/admin/login");
          }}
          className="px-6 py-3 text-left text-red-400 hover:bg-red-600 hover:text-white"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
