import { useCallback, useEffect, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import PageIntro from "../components/ui/PageIntro";

const API_URL = import.meta.env.VITE_API_URL;

export default function AdminAdmissions() {
  const [admissions, setAdmissions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("adminToken");

  const fetchAdmissions = useCallback(() => {
    fetch(`${API_URL}/api/admissions`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setAdmissions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) {
      window.location.href = "/admin-login";
      return;
    }
    fetchAdmissions();
  }, [fetchAdmissions, token]);

  async function deleteAdmission(id) {
    if (!window.confirm("Delete this admission?")) return;

    const res = await fetch(
      `${API_URL}/api/admissions/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (res.ok) fetchAdmissions();
  }

  if (loading) {
    return <div className="p-10">Loading...</div>;
  }

  return (
    <div className="flex">
      <AdminSidebar />

      <div className="ml-20 lg:ml-72 p-8 w-full">
        <PageIntro
          title="Admissions"
          description="Review and manage incoming admission requests."
        />

        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="saas-input mt-4 w-full max-w-md"
        />

        <table className="w-full bg-white shadow rounded-xl overflow-hidden">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-2">Student</th>
              <th className="p-2">Class</th>
              <th className="p-2">Parent</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {admissions
              .filter((a) =>
                a.studentName
                  ?.toLowerCase()
                  .includes(search.toLowerCase())
              )
              .map((a) => (
                <tr key={a._id}>
                  <td className="p-2">{a.studentName}</td>
                  <td className="p-2">{a.classApplying}</td>
                  <td className="p-2">{a.parentName}</td>
                  <td className="p-2">
                    <button
                      onClick={() => deleteAdmission(a._id)}
                      className="bg-red-600 text-white px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
