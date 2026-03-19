"use client";

import CountUp from "react-countup";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "./AnimatedSection";

interface CountUpStatProps {
  end: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
  decimals?: number;
}

export function CountUpStat({ end, prefix = "", suffix = "", duration = 2.5, className, decimals = 0 }: CountUpStatProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <span ref={ref} className={cn("font-bold tabular-nums", className)}>
      {isInView ? (
        <CountUp
          start={0}
          end={end}
          duration={duration}
          separator=","
          decimals={decimals}
          prefix={prefix}
          suffix={suffix}
          useEasing={true}
        />
      ) : (
        <span>{prefix}0{suffix}</span>
      )}
    </span>
  );
}
