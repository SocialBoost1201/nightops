"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AnimatedProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

export function AnimatedSection({ children, className, delay = 0, duration = 0.6 }: AnimatedProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration, ease: "easeOut", delay }}
      className={cn("w-full py-16 md:py-24", className)}
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {children}
      </div>
    </motion.section>
  );
}

export function AnimatedDiv({ children, className, delay = 0, duration = 0.6 }: AnimatedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration, ease: "easeOut", delay }}
      className={className}
    >
      {/* @ts-expect-error React 19 compatibility with current Framer Motion */}
      {children}
    </motion.div>
  );
}
