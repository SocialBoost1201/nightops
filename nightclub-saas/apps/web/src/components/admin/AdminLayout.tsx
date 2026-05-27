"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "/approvals/pending", label: "承認待ち", badge: "PENDING" },
  { href: "/approvals/unlock-requests", label: "アンロック履歴" },
  { href: "/audit-logs", label: "監査ログ" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0A0E17] text-gray-200 flex flex-col">
      {/* Top bar */}
      <header className="h-14 border-b border-gray-800 flex items-center px-6 gap-6 shrink-0">
        <Link href="/" className="text-lg font-extrabold tracking-tighter text-white mr-4">
          Night<span className="text-blue-500">Ops</span>
          <span className="text-xs font-normal text-gray-500 ml-2">管理コンソール</span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "px-3 py-1.5 rounded text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
