import { useNavigate } from "react-router-dom";

export default function AdminSidebar() {
  const navigate = useNavigate();

  return (
    <div className="w-64 h-screen bg-slate-900 text-white fixed flex flex-col">
      <div className="p-6 text-xl font-bold border-b border-slate-700">
        🏫 Admin Panel
      </div>

      <div className="mt-6 flex flex-col flex-1">
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
      </div>

      <button
        onClick={() => {
          localStorage.removeItem("adminToken");
          navigate("/admin/login");
        }}
        className="mx-6 mb-6 px-6 py-3 text-left bg-rose-100 text-rose-700 font-bold rounded hover:bg-rose-200"
      >
        Logout
      </button>
    </div>
  );
}
