"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/approvals/pending", label: "承認待ち", icon: "⏳" },
  { href: "/admin/approvals/unlock-requests", label: "解除申請履歴", icon: "🔓" },
  { href: "/admin/audit-logs", label: "監査ログ", icon: "📋" },
  { href: "/system/tenants", label: "テナント管理", icon: "🏢" },
  { href: "/billing/overview", label: "課金状況", icon: "💳" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0A0E17] text-gray-200 flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-[#0d1220] border-r border-white/5 flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-white/5">
          <Link href="/" className="text-xl font-extrabold tracking-tighter text-white">
            Night<span className="text-blue-500">Ops</span>
          </Link>
          <span className="ml-2 text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
            Admin
          </span>
        </div>
        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-500/15 text-blue-300"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/5 text-xs text-gray-600">
          NightOps v0.1.0
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-[#0d1220]/80 backdrop-blur border-b border-white/5 flex items-center px-6 shrink-0">
          <div className="flex-1" />
          <div className="text-xs text-gray-500">
            {new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
