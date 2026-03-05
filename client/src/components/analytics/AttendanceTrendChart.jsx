import { memo } from "react";
import { CartesianGrid, Label, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function AttendanceTrendChart({ data = [] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
          <XAxis dataKey="label" tick={{ fill: "#cbd5e1", fontSize: 11 }}>
            <Label value="Day" position="insideBottom" dy={10} fill="#cbd5e1" fontSize={11} />
          </XAxis>
          <YAxis domain={[0, 100]} tick={{ fill: "#cbd5e1", fontSize: 11 }}>
            <Label value="Attendance %" angle={-90} position="insideLeft" dx={-8} fill="#cbd5e1" fontSize={11} />
          </YAxis>
          <Tooltip
            formatter={(value) => [`${Number(value) || 0}%`, "Attendance"]}
            contentStyle={{
              background: "#0f172a",
              border: "1px solid rgba(148,163,184,0.3)",
              borderRadius: 10,
              color: "#e2e8f0",
            }}
          />
          <Line type="monotone" dataKey="attendance" stroke="#38bdf8" strokeWidth={3} dot={{ r: 3, fill: "#38bdf8" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(AttendanceTrendChart);
