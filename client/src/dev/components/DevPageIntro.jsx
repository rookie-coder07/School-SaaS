export default function DevPageIntro({ title, description, icon }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-7 shadow-xl shadow-slate-950/40">
      <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white">{title}</h2>
          {description ? <p className="mt-2 text-sm text-slate-300">{description}</p> : null}
        </div>
        <div className="flex justify-center md:justify-end">
          {icon ? <div className="flex h-20 w-20 items-center justify-center text-white/40">{icon}</div> : null}
        </div>
      </div>
    </div>
  );
}
