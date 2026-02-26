const statusMeta = (percentage) => {
  if (percentage > 75) return { label: "Good", text: "text-emerald-700", chip: "bg-emerald-100 text-emerald-700" };
  if (percentage >= 40) return { label: "Average", text: "text-amber-700", chip: "bg-amber-100 text-amber-700" };
  return { label: "Needs Improvement", text: "text-rose-700", chip: "bg-rose-100 text-rose-700" };
};

export default function StudentMarksCards({ exams = [], legacyMarks = [] }) {
  if (!Array.isArray(exams) || exams.length === 0) {
    if (!Array.isArray(legacyMarks) || legacyMarks.length === 0) {
      return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500">
          No marks available
        </div>
      );
    }

    return (
      <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-700">
        Legacy marks found. Ask your teacher to publish marks using the new exam format.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {exams.map((exam) => {
        const percentage = Number(exam.percentage || 0);
        const meta = statusMeta(percentage);
        const subjects = Array.isArray(exam.subjects) ? exam.subjects : [];

        return (
          <div key={exam.examId} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{exam.examName}</h3>
                  <p className="text-xs text-slate-500">{exam.date ? new Date(exam.date).toLocaleDateString() : "Date not set"}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${meta.chip}`}>{meta.label}</span>
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-700">
                Total Obtained / Total Max: {Number(exam.totalObtained || 0)} / {Number(exam.totalMax || 0)} {" "}
                <span className={meta.text}>({percentage.toFixed(2)}%)</span>
              </div>
            </div>

            <div className="p-4">
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Subject</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Marks</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Max</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subject) => {
                      const obtained = subject.obtained === null || subject.obtained === undefined ? null : Number(subject.obtained);
                      const max = Number(subject.maxMarks || 0);
                      const pct = obtained === null || max <= 0 ? 0 : (obtained / max) * 100;

                      return (
                        <tr key={`${exam.examId}-${subject.subject}`} className="border-t border-slate-200">
                          <td className="px-3 py-2 font-medium text-slate-800">{subject.subject}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{obtained === null ? "—" : obtained}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{max}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{pct.toFixed(2)}%</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-slate-300 bg-slate-50">
                      <td className="px-3 py-2 font-semibold text-slate-900">Total</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">{Number(exam.totalObtained || 0)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">{Number(exam.totalMax || 0)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">{percentage.toFixed(2)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
