"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface UndoToastProps {
  isVisible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

export function UndoToast({ isVisible, message, onUndo, onDismiss, durationMs = 5000 }: UndoToastProps) {
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (isVisible) {
      timerId = setTimeout(() => {
        onDismiss();
      }, durationMs);
    }
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [isVisible, durationMs, onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-24 left-4 right-4 z-50 pointer-events-auto"
        >
          <div className="bg-[#1E293B] border border-gray-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-gray-200 text-sm font-medium">{message}</span>
              <button
                onClick={onUndo}
                className="text-blue-400 font-bold text-sm px-3 py-1.5 rounded-md bg-blue-500/10 active:bg-blue-500/20 transition-colors"
              >
                元に戻す
              </button>
            </div>
            
            {/* Progress Bar indicating time left to undo */}
            <div className="h-1 bg-gray-800 w-full">
              <motion.div 
                className="h-full bg-blue-500"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: durationMs / 1000, ease: "linear" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
