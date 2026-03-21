import React from "react";

export default function StatCard({ title, value, icon, color = "text-white" }) {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center justify-between hover:scale-[1.02] transition-all">
      <div>
        <p className="text-xs text-gray-400">{title}</p>
        <h2 className="text-2xl font-bold text-white">{value}</h2>
      </div>
      <div className={`text-2xl ${color}`}>
        {icon}
      </div>
    </div>
  );
}
