"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { clsx } from "clsx";

interface SwipeToSubmitProps {
  onConfirm: () => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
  successPhrase?: string;
}

export function SwipeToSubmit({ onConfirm, isLoading, disabled = false, successPhrase = "登録完了" }: SwipeToSubmitProps) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const containerRef = useRef<HTMLDivElement>(null);
  const dragControls = useAnimation();
  const x = useMotionValue(0);

  // Dynamic opacity and text based on drag position
  const textOpacity = useTransform(x, [0, 150], [1, 0]);

  const triggerHaptic = useCallback((type: "light" | "heavy" | "success" | "error") => {
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      if (type === "light") window.navigator.vibrate(10);
      else if (type === "heavy") window.navigator.vibrate([30]);
      else if (type === "success") window.navigator.vibrate([20, 50, 20]);
      else if (type === "error") window.navigator.vibrate([50, 50, 50, 50]);
    }
  }, []);

  // Handle successful submission feedback
  const handleSuccess = useCallback(async () => {
    setStatus("success");
    triggerHaptic("success");
    // Show success state briefly then reset
    setTimeout(() => {
      setStatus("idle");
      dragControls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
    }, 1500);
  }, [dragControls, triggerHaptic]);

  // Handle error feedback
  const handleError = useCallback(() => {
    setStatus("error");
    triggerHaptic("error");
    dragControls.start({ x: [0, -10, 10, -10, 10, 0], transition: { duration: 0.4 } }).then(() => {
      setTimeout(() => {
        setStatus("idle");
      }, 1500);
    });
  }, [dragControls, triggerHaptic]);

  const handleDragEnd = async (event: any, info: any) => {
    if (disabled || isLoading) return;

    const containerWidth = containerRef.current?.offsetWidth || 300;
    const dragDistance = info.offset.x;
    
    // Threshold is 70% of container width
    const threshold = containerWidth * 0.7;

    if (dragDistance > threshold) {
      // Trigger submission
      triggerHaptic("heavy");
      try {
        await onConfirm();
        handleSuccess();
      } catch (e) {
        handleError();
      }
    } else {
      // Snap back if threshold not met
      triggerHaptic("light");
      dragControls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
    }
  };

  return (
    <div 
      ref={containerRef}
      className={clsx(
        "relative w-full h-16 rounded-full overflow-hidden flex items-center justify-center border",
        disabled ? "bg-gray-900 border-gray-800" : "bg-blue-900/30 border-blue-500/30",
        status === "success" && "bg-green-600/20 border-green-500/50",
        status === "error" && "bg-red-900/20 border-red-500/50"
      )}
    >
      {/* Background Track Text */}
      <motion.div 
        style={{ opacity: textOpacity }}
        className="absolute w-full text-center pointer-events-none select-none"
      >
        <span className={clsx(
          "font-bold text-sm tracking-widest uppercase",
          disabled ? "text-gray-600" : "text-blue-400/70"
        )}>
          {isLoading ? "送信中..." : "スワイプして登録"}
        </span>
      </motion.div>

      {/* Success/Error Text Overlay */}
      {status === "success" && (
        <div className="absolute w-full text-center text-green-400 font-bold z-10 animate-pulse">
          ✓ {successPhrase}
        </div>
      )}
      {status === "error" && (
        <div className="absolute w-full text-center text-red-500 font-bold z-10">
          ✕ 登録失敗
        </div>
      )}

      {/* Draggable Thumb */}
      <motion.div
        drag={disabled || isLoading || status !== "idle" ? false : "x"}
        dragConstraints={containerRef}
        dragElastic={0}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={dragControls}
        style={{ x }}
        className={clsx(
          "absolute left-1 top-1 bottom-1 w-14 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing",
          disabled ? "bg-gray-800 text-gray-500" : "bg-white text-blue-900 shadow-[0_0_15px_rgba(255,255,255,0.3)]"
        )}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-blue-900/30 border-t-blue-900 rounded-full animate-spin" />
        ) : (
          <span className={clsx("font-extrabold text-xl", disabled && "opacity-50")}>»</span>
        )}
      </motion.div>
    </div>
  );
}
