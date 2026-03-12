import { Link } from "react-router-dom";
import PageContainer from "../components/ui/PageContainer";
import PageIntro from "../components/ui/PageIntro";

export default function Admissions() {
  return (
    <PageContainer className="space-y-10">
      <PageIntro
        title="Admissions"
        description="Join Ghalib Public School and become part of a community committed to academic excellence, character, and leadership."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="saas-card p-6">
          <h2 className="text-xl font-semibold mb-3 text-slate-900">Eligibility</h2>
          <p className="text-sm text-slate-600">
            Admissions are open for students from Kindergarten to Senior Secondary based on age and academic criteria.
          </p>
        </div>

        <div className="saas-card p-6">
          <h2 className="text-xl font-semibold mb-3 text-slate-900">Admission Process</h2>
          <p className="text-sm text-slate-600">
            Fill out the application form, attend the interaction session, and submit required documents.
          </p>
        </div>

        <div className="saas-card p-6">
          <h2 className="text-xl font-semibold mb-3 text-slate-900">Important Dates</h2>
          <p className="text-sm text-slate-600">
            Admissions open in January every year. Limited seats are available for each class.
          </p>
        </div>
      </div>

      <div className="saas-card p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Ready to Apply?</h2>
          <p className="text-sm text-slate-600">Submit your application online and we will guide you through the next steps.</p>
        </div>
        <Link
          to="/apply"
          className="inline-flex items-center justify-center bg-blue-600 text-white px-8 py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
        >
          Apply Now
        </Link>
      </div>
    </PageContainer>
  );
}
