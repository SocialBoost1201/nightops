"use client";

import { ReactNode } from "react";

interface ScreenLayoutProps {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
}

export function ScreenLayout({ children, header, footer }: ScreenLayoutProps) {
  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#0A0E17] text-[#F8FAFC]">
      {/* Header Area (Fixed Top) */}
      <header className="flex-shrink-0 w-full bg-[#0A0E17] border-b border-gray-800 z-10 p-4">
        {header}
      </header>

      {/* Main Content Area (Scrollable optionally but preferred fixed for input) */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {children}
      </main>

      {/* Footer / Numpad / Submit Area (Fixed Bottom) */}
      <footer className="flex-shrink-0 w-full bg-[#0A0E17] border-t border-gray-800 pb-safe z-10 px-2 pb-6 pt-2">
        {footer}
      </footer>
    </div>
  );
}
