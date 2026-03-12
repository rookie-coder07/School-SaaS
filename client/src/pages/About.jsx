import { BarChart3 } from "lucide-react";
import PageContainer from "../components/ui/PageContainer";
import PageIntro from "../components/ui/PageIntro";

export default function About() {
  return (
    <PageContainer className="space-y-10">
      <PageIntro
        title="Our Story"
        description="Pushing boundaries and creating meaningful experiences since 2024."
      />

      <section className="grid gap-8 md:grid-cols-2 items-center">
        <div className="saas-card p-5 md:p-6 space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Who We Are</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            We are a team of designers, developers, and educators dedicated to building tools that make school
            management simpler. Our approach is user-first design backed by reliable engineering.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Whether it is a local campus or a district network, we bring the same level of precision and care to every
            workflow.
          </p>
        </div>
        <div className="saas-card p-5 md:p-6 flex items-center justify-center">
          <BarChart3 className="h-16 w-16 text-indigo-300" aria-hidden="true" />
        </div>
      </section>

      <section className="saas-card p-5 md:p-6">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">Our Values</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <ValueCard title="Innovation" desc="Always looking for a better way to solve old problems." />
          <ValueCard title="Transparency" desc="Open communication is the foundation of our trust." />
          <ValueCard title="Quality" desc="We do not ship until it is something we are proud of." />
        </div>
      </section>
    </PageContainer>
  );
}

// Helper Component for the grid
function ValueCard({ title, desc }) {
  return (
    <div className="p-6 bg-white/90 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold mb-2 text-indigo-600">{title}</h3>
      <p className="text-sm text-slate-500">{desc}</p>
    </div>
  );
}
