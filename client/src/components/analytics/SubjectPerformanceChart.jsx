import { memo } from "react";
import { Bar, BarChart, CartesianGrid, Label, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function SubjectPerformanceChart({ data = [] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
          <XAxis dataKey="subject" tick={{ fill: "#cbd5e1", fontSize: 11 }}>
            <Label value="Subjects" position="insideBottom" dy={10} fill="#cbd5e1" fontSize={11} />
          </XAxis>
          <YAxis domain={[0, 100]} tick={{ fill: "#cbd5e1", fontSize: 11 }}>
            <Label value="Average Score" angle={-90} position="insideLeft" dx={-8} fill="#cbd5e1" fontSize={11} />
          </YAxis>
          <Tooltip
            formatter={(value) => [`${Number(value) || 0}%`, "Average"]}
            contentStyle={{
              background: "#0f172a",
              border: "1px solid rgba(148,163,184,0.3)",
              borderRadius: 10,
              color: "#e2e8f0",
            }}
          />
          <Bar dataKey="averageMarks" fill="#34d399" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(SubjectPerformanceChart);
