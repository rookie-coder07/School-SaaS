import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function DevFeaturesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">System Modules</h1>
        <p className="text-slate-400">All system modules are enabled and operational</p>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Available Modules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: "Attendance", description: "Student attendance tracking" },
            { name: "Homework", description: "Assignment management" },
            { name: "Exams", description: "Exam and marks management" },
            { name: "Analytics", description: "Performance analytics and reporting" },
            { name: "Voice Messages", description: "Voice broadcast capability" },
            { name: "Notifications", description: "System notifications" },
          ].map((module) => (
            <div key={module.name} className="rounded-lg border border-slate-600 bg-slate-700/50 p-4">
              <h4 className="font-semibold text-white mb-1">{module.name}</h4>
              <p className="text-sm text-slate-400">{module.description}</p>
              <div className="mt-3 inline-block px-2 py-1 rounded text-xs font-semibold bg-green-900/30 text-green-300">
                Enabled
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

