import { useMemo } from "react";
import { FileText, HelpCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import PageIntro from "../components/ui/PageIntro";

const infoContent = {
  faq: {
    title: "FAQ",
    description: "Answers to common questions",
    items: [
      {
        question: "How do I reset my password?",
        answer: "Use the Change Password control inside Settings or visit the Change Password page once authenticated.",
      },
      {
        question: "How does fingerprint login work?",
        answer: "After registering a device, enable Fingerprint Login to authenticate with your phone's biometrics.",
      },
    ],
  },
  terms: {
    title: "Terms & Conditions",
    description: "What governs your use of EduNest",
    items: [
      {
        question: "Who can use the platform?",
        answer: "Institutions, teachers, and students who have been onboarded by their schools agree to the same standards set by the school.",
      },
      {
        question: "What are acceptable use expectations?",
        answer: "Respect the privacy of others, do not share passwords, and keep school data current. Contact support for help.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    description: "How we handle your data",
    items: [
      {
        question: "What data we collect?",
        answer: "We store only profile data, session logs, and the information you provide for school reporting.",
      },
      {
        question: "How can I delete my account?",
        answer: "Reach out via Contact Us and include your email; our team will assist with the removal request.",
      },
    ],
  },
  features: {
    title: "Exciting Features",
    description: "Sneak peek at what is coming",
    items: [
      {
        question: "Real-time analytics",
        answer: "Soon: dashboards for live attendance, voice alerts, and student performance summaries.",
      },
      {
        question: "Offline messaging",
        answer: "We are working on offline-first capabilities so teachers can log updates even with flaky connectivity.",
      },
    ],
  },
};

const infoIcons = {
  faq: HelpCircle,
  terms: FileText,
  privacy: ShieldCheck,
  features: Sparkles,
};

export default function SettingsInfoPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const content = useMemo(() => infoContent[slug] || null, [slug]);
  const Icon = infoIcons[slug] || FileText;

  if (!content) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-slate-500">Settings</p>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Coming soon</h1>
          <p className="mt-2 text-sm text-slate-500">We are preparing this page for you.</p>
          <div className="mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
            <FileText className="h-8 w-8" aria-hidden="true" />
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-6 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <header className="space-y-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm font-semibold text-slate-500 underline-offset-4 hover:underline"
          >
            Back
          </button>
          <PageIntro
            title={content.title}
            description={content.description}
            icon={<Icon className="h-16 w-16" aria-hidden="true" />}
          />
        </header>

        <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          {content.items.map((item) => (
            <article key={item.question} className="space-y-1">
              <h2 className="text-base font-semibold text-slate-900">{item.question}</h2>
              <p className="text-sm text-slate-500">{item.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
