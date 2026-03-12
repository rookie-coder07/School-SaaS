import { useEffect, useState } from "react";
import DevPortalLayout from "../components/DevPortalLayout";

const API_URL = import.meta.env.VITE_API_URL;

const featureKeys = [
  { key: "voiceCalls", label: "Voice Calls" },
  { key: "analytics", label: "Analytics" },
  { key: "homework", label: "Homework" },
  { key: "notifications", label: "Notifications" },
];

export default function DevFeatures() {
  const token = localStorage.getItem("developerToken");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [features, setFeatures] = useState({
    voiceCalls: true,
    analytics: true,
    homework: true,
    notifications: true,
  });

  useEffect(() => {
    const loadFeatures = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_URL}/api/dev/features`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || payload?.error || "Failed to fetch feature flags");
        }
        setFeatures((prev) => ({ ...prev, ...(payload.data || {}) }));
      } catch (requestError) {
        setError(requestError?.message || "Failed to fetch feature flags");
      } finally {
        setLoading(false);
      }
    };
    loadFeatures();
  }, []);

  const toggleFeature = async (key) => {
    const nextState = { ...features, [key]: !features[key] };
    setFeatures(nextState);
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/dev/features`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(nextState),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || payload?.error || "Failed to update feature flags");
      }
      setFeatures((prev) => ({ ...prev, ...(payload.data || {}) }));
    } catch (requestError) {
      setError(requestError?.message || "Failed to update feature flags");
      setFeatures(features);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DevPortalLayout title="Feature Flags" subtitle="Toggle platform features for the SaaS environment.">
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          {featureKeys.map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-bold text-slate-900">{item.label}</p>
              <button
                type="button"
                disabled={loading || saving}
                onClick={() => toggleFeature(item.key)}
                className={[
                  "rounded-full px-3 py-1 text-xs font-bold transition",
                  features[item.key] ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-slate-200 text-slate-700 hover:bg-slate-300",
                ].join(" ")}
              >
                {features[item.key] ? "Enabled" : "Disabled"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </DevPortalLayout>
  );
}
