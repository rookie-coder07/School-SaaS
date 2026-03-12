import { motion } from "framer-motion";

export default function PageContainer({ children, className = "" }) {
  return (
    <motion.div
      className={`saas-page page-fade ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
