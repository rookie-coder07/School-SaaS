export default function SectionCard({ title, description, children, className = "" }) {
  return (
    <section
      className={`rounded-xl border p-4 sm:p-6 bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] ${className}`}
    >
      {(title || description) && (
        <header className="mb-4 space-y-1">
          {title ? <h2 className="text-lg font-semibold">{title}</h2> : null}
          {description ? (
            <p className="text-sm text-[var(--text-secondary)]">{description}</p>
          ) : null}
        </header>
      )}
      {children}
    </section>
  );
}
