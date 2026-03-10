export default function ListItemCard({ children, className = "", ...props }) {
  return (
    <div className={`saas-list-card p-3 md:p-4 min-w-0 max-w-full ${className}`} {...props}>
      {children}
    </div>
  );
}
