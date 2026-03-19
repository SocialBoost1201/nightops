"use client";

import { useCallback, useRef } from "react";
import { clsx } from "clsx";

interface CustomNumpadProps {
  onInput: (val: string) => void;
  onDelete: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export function CustomNumpad({ onInput, onDelete, onClear, disabled = false }: CustomNumpadProps) {
  const keys = [
    { id: "1", label: "1" },
    { id: "2", label: "2" },
    { id: "3", label: "3" },
    { id: "4", label: "4" },
    { id: "5", label: "5" },
    { id: "6", label: "6" },
    { id: "7", label: "7" },
    { id: "8", label: "8" },
    { id: "9", label: "9" },
    { id: "00", label: "00" },
    { id: "0", label: "0" },
    { id: "delete", label: "⌫", action: "delete" },
  ];

  // Haptic feedback simulator (available only in supported mobile browsers or Capacitor/React Native webs)
  const triggerHaptic = useCallback(() => {
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(10); // 10ms light pop
    }
  }, []);

  const deleteTimerRef = useRef<NodeJS.Timeout>(null);

  const handlePress = useCallback(
    (key: typeof keys[0]) => {
      if (disabled) return;
      triggerHaptic();
      onInput(key.id);
    },
    [disabled, onInput, triggerHaptic]
  );

  const handleDeletePointerDown = useCallback(() => {
    if (disabled) return;
    deleteTimerRef.current = setTimeout(() => {
      onClear();
      // Heavy haptic for clear
      if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([20, 20, 20]);
      }
      deleteTimerRef.current = null;
    }, 500);
  }, [disabled, onClear]);

  const handleDeletePointerUp = useCallback(() => {
    if (disabled) return;
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
      onDelete();
      triggerHaptic();
    }
  }, [disabled, onDelete, triggerHaptic]);

  const handleDeletePointerLeave = useCallback(() => {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
  }, []);

  return (
    <div className="w-full max-w-sm mx-auto grid grid-cols-3 gap-2 px-1 pb-4">
      {keys.map((key) => (
        <button
          key={key.id}
          onClick={key.action !== "delete" ? () => handlePress(key) : undefined}
          onPointerDown={key.action === "delete" ? handleDeletePointerDown : undefined}
          onPointerUp={key.action === "delete" ? handleDeletePointerUp : undefined}
          onPointerLeave={key.action === "delete" ? handleDeletePointerLeave : undefined}
          disabled={disabled}
          className={clsx(
            "h-16 md:h-20 rounded-xl text-3xl font-medium active:scale-95 transition-transform select-none touch-manipulation",
            key.action === "delete" 
              ? "bg-[#1E293B] text-gray-400 active:bg-[#334155]"
              : "bg-[#0F172A] text-white active:bg-blue-900 border border-gray-800"
          )}
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          {key.label}
        </button>
      ))}
    </div>
  );
}
