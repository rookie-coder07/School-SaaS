export default function PageContainer({ children, className = "" }) {
  return (
    <div className={`bg-white/80 backdrop-blur-md rounded-3xl shadow-md border border-slate-200 p-3 md:p-6 ${className}`}>
      {children}
    </div>
  );
}
