"use client";

import { motion } from "framer-motion";
import { cn } from "./AnimatedSection";

interface ButtonCtaProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function ButtonCta({ children, href, onClick, className }: ButtonCtaProps) {
  const Component = href ? motion.a : motion.button;
  const props = href ? { href, className: cn("inline-block", className) } : { onClick, className };

  return (
    <Component
      {...props}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "bg-[#3B82F6] hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-colors text-center w-full sm:w-auto",
        className
      )}
    >
      {children}
    </Component>
  );
}
