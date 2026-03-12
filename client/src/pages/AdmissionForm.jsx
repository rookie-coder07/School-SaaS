import { useState } from "react";
import PageContainer from "../components/ui/PageContainer";
import PageIntro from "../components/ui/PageIntro";

const API_URL = import.meta.env.VITE_API_URL;

export default function AdmissionForm() {
  const [formData, setFormData] = useState({
    studentName: "",
    dob: "",
    classApplying: "",
    parentName: "",
    phone: "",
    email: "",
  });

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const response = await fetch(`${API_URL}/api/admissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      alert("HTTP STATUS: " + response.status);

      const text = await response.text();
      alert("RESPONSE BODY: " + text);
    } catch (error) {
      alert("FETCH ERROR: " + error.message);
    }
  }

  return (
    <PageContainer className="space-y-8">
      <PageIntro
        title="Online Admission Form"
        description="Submit your admission request online. Our team will review and respond promptly."
      />

      <div className="saas-card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-700">Student Full Name</label>
            <input
              type="text"
              name="studentName"
              value={formData.studentName}
              onChange={handleChange}
              required
              className="saas-input"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-700">Date of Birth</label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              required
              className="saas-input"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-700">Class Applying For</label>
            <select
              name="classApplying"
              value={formData.classApplying}
              onChange={handleChange}
              required
              className="saas-input"
            >
              <option value="">Select Class</option>
              <option>KG</option>
              <option>Class 1</option>
              <option>Class 2</option>
              <option>Class 3</option>
              <option>Class 4</option>
              <option>Class 5</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-700">Parent / Guardian Name</label>
            <input
              type="text"
              name="parentName"
              value={formData.parentName}
              onChange={handleChange}
              required
              className="saas-input"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-700">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="saas-input"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-700">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="saas-input"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-blue-700 transition"
          >
            Submit Application
          </button>
        </form>
      </div>
    </PageContainer>
  );
}
