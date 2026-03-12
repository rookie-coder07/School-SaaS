import { Mail, MapPin, Phone } from "lucide-react";
import PageContainer from "../components/ui/PageContainer";
import PageIntro from "../components/ui/PageIntro";

export default function Contact() {
  return (
    <PageContainer className="space-y-8">
      <PageIntro
        title="Get in Touch"
        description="Have a project in mind or just want to say hi? Drop us a message and we will respond within 24 hours."
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="saas-card p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Contact Information</h3>
            <p className="text-sm text-slate-600">We are ready to help with onboarding and support.</p>
          </div>
          <div className="space-y-4">
            <ContactMethod icon={<MapPin className="h-5 w-5" />} label="Visit Us" detail="123 Innovation Way, Tech City" />
            <ContactMethod icon={<Mail className="h-5 w-5" />} label="Email Us" detail="hello@brandname.com" />
            <ContactMethod icon={<Phone className="h-5 w-5" />} label="Call Us" detail="+1 (555) 000-0000" />
          </div>
        </div>

        <div className="md:col-span-2 saas-card p-6">
          <form className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-slate-700 mb-2">First Name</label>
              <input type="text" className="saas-input" placeholder="John" />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-slate-700 mb-2">Last Name</label>
              <input type="text" className="saas-input" placeholder="Doe" />
            </div>
            <div className="flex flex-col sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700 mb-2">Email Address</label>
              <input type="email" className="saas-input" placeholder="john@example.com" />
            </div>
            <div className="flex flex-col sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700 mb-2">Message</label>
              <textarea rows="4" className="saas-input resize-none" placeholder="How can we help you?" />
            </div>
            <button className="sm:col-span-2 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </PageContainer>
  );
}

function ContactMethod({ icon, label, detail }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-blue-600">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-sm text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
