export default function EmptyState({ title = "No data available", description = "Try adjusting filters or refresh." }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600">
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="mt-2 text-sm">{description}</p>
    </div>
  );
}

