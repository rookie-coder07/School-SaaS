import { memo } from "react";
import { Bar, BarChart, CartesianGrid, Label, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function MarksDistributionChart({ data = [] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
          <XAxis dataKey="label" tick={{ fill: "#cbd5e1", fontSize: 11 }}>
            <Label value="Marks Range" position="insideBottom" dy={10} fill="#cbd5e1" fontSize={11} />
          </XAxis>
          <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} allowDecimals={false}>
            <Label value="Number of Students" angle={-90} position="insideLeft" dx={-8} fill="#cbd5e1" fontSize={11} />
          </YAxis>
          <Tooltip
            formatter={(value) => [Number(value) || 0, "Students"]}
            contentStyle={{
              background: "#0f172a",
              border: "1px solid rgba(148,163,184,0.3)",
              borderRadius: 10,
              color: "#e2e8f0",
            }}
          />
          <Bar dataKey="count" fill="#818cf8" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(MarksDistributionChart);
