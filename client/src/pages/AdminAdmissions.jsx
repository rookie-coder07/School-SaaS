import { useEffect, useState } from "react";

export default function AdminAdmissions() {
  const [admissions, setAdmissions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdmissions();
  }, []);

  /* ===============================
     FETCH ALL ADMISSIONS
     =============================== */
  function fetchAdmissions() {
    fetch("http://localhost:5000/api/admissions")
      .then((res) => res.json())
      .then((data) => {
        setAdmissions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  /* ===============================
     DELETE ADMISSION (ADMIN)
     =============================== */
  async function deleteAdmission(id) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this application permanently?"
    );
    if (!confirmDelete) return;

    const token = localStorage.getItem("token");

    if (!token) {
      alert("Admin not logged in");
      return;
    }

    const res = await fetch(
      `http://localhost:5000/api/admissions/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Delete failed");
      return;
    }

    alert("Application deleted successfully");
    fetchAdmissions(); // refresh table
  }

  /* ===============================
     SEARCH FILTER
     =============================== */
  const filteredAdmissions = admissions.filter((a) => {
    const query = search.toLowerCase();
    return (
      a.studentName?.toLowerCase().includes(query) ||
      a.email?.toLowerCase().includes(query) ||
      a.classApplying?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">
          Accessing Secure Records...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Admissions <span className="text-emerald-600">Portal</span>
            </h1>
            <p className="text-slate-500">
              Managing entries for Dream Valley Public School
            </p>
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search applications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 pr-6 py-3 w-full md:w-80 bg-white shadow-sm rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900 text-slate-400 uppercase text-xs font-bold">
                  <th className="px-8 py-5">Student Details</th>
                  <th className="px-8 py-5">Class</th>
                  <th className="px-8 py-5">Parent/Contact</th>
                  <th className="px-8 py-5 text-center">Status</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredAdmissions.map((item) => (
                  <tr key={item._id} className="group hover:bg-slate-50">
                    <td className="px-8 py-6">
                      <p className="font-bold">{item.studentName}</p>
                      <p className="text-sm text-slate-500">{item.email}</p>
                    </td>

                    <td className="px-8 py-6">
                      Grade {item.classApplying}
                    </td>

                    <td className="px-8 py-6">
                      <p>{item.parentName}</p>
                      <p className="text-sm text-slate-500">{item.phone}</p>
                    </td>

                    <td className="px-8 py-6 text-center">
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                        Pending
                      </span>
                    </td>

                    <td className="px-8 py-6 text-right">
                      <button
                        onClick={() => deleteAdmission(item._id)}
                        className="opacity-0 group-hover:opacity-100 transition bg-rose-50 text-rose-600 px-4 py-2 rounded-xl hover:bg-rose-600 hover:text-white font-bold text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAdmissions.length === 0 && (
            <div className="py-20 text-center text-slate-400">
              No applications found.
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between text-sm text-slate-400 px-4">
          <p>Showing {filteredAdmissions.length} total applications</p>
          <p>© 2026 Dream Valley Management System</p>
        </div>
      </div>
    </div>
  );
}
