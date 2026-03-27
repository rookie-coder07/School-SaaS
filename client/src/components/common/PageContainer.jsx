export default function PageContainer({ children, className = "" }) {
  return (
    <div className={`min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] ${className}`}>
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">{children}</div>
    </div>
  );
}
