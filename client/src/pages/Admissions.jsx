import { Link } from "react-router-dom";

export default function Admissions() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-6">
      
      {/* ===== Header ===== */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4 text-gray-900">
          Admissions
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Join Ghalib Public School and become part of a community
          committed to academic excellence, character, and leadership.
        </p>
      </div>

      {/* ===== Admission Information Cards ===== */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition">
          <h2 className="text-2xl font-semibold mb-3 text-gray-900">
            Eligibility
          </h2>
          <p className="text-gray-600">
            Admissions are open for students from Kindergarten
            to Senior Secondary based on age and academic criteria.
          </p>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition">
          <h2 className="text-2xl font-semibold mb-3 text-gray-900">
            Admission Process
          </h2>
          <p className="text-gray-600">
            Fill out the application form, attend the interaction
            session, and submit required documents.
          </p>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition">
          <h2 className="text-2xl font-semibold mb-3 text-gray-900">
            Important Dates
          </h2>
          <p className="text-gray-600">
            Admissions open in January every year.
            Limited seats available for each class.
          </p>
        </div>

      </div>

      {/* ===== Call To Action ===== */}
      <div className="text-center mt-20">
        <h2 className="text-3xl font-bold mb-6 text-gray-900">
          Ready to Apply?
        </h2>

        <Link
          to="/apply"
          className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition"
        >
          Apply Now
        </Link>
      </div>

    </div>
  );
}
