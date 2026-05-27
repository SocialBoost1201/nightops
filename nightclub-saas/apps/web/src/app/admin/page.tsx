import Link from "next/link";

const CARDS = [
  {
    href: "/admin/approvals/pending",
    icon: "⏳",
    title: "承認待ち",
    description: "月次ロック解除申請など、対応が必要な承認アイテムを確認・処理します。",
    badge: "要対応",
    badgeColor: "bg-yellow-500/15 text-yellow-300",
  },
  {
    href: "/admin/approvals/unlock-requests",
    icon: "🔓",
    title: "解除申請履歴",
    description: "月次ロック解除申請の全履歴を確認・フィルタリングできます。",
    badge: "履歴",
    badgeColor: "bg-blue-500/15 text-blue-300",
  },
  {
    href: "/admin/audit-logs",
    icon: "📋",
    title: "監査ログ",
    description: "インシデント調査・財務監査・操作追跡のための監査イベント検索。",
    badge: "調査",
    badgeColor: "bg-purple-500/15 text-purple-300",
  },
];

export default function AdminDashboard() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">管理コンソール</h1>
        <p className="text-sm text-gray-400 mt-1">
          NightOps 運営・監査・承認ワークフローの管理画面
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-[#0d1220] border border-white/5 rounded-xl p-5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${card.badgeColor}`}>
                {card.badge}
              </span>
            </div>
            <h2 className="text-base font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors">
              {card.title}
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed">{card.description}</p>
          </Link>
        ))}
      </div>

      <div className="bg-[#0d1220] border border-white/5 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">その他の管理機能</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/system/tenants"
            className="text-sm text-gray-400 hover:text-gray-200 border border-white/10 hover:border-white/20 px-4 py-2 rounded-md transition-colors"
          >
            🏢 テナント管理
          </Link>
          <Link
            href="/billing/overview"
            className="text-sm text-gray-400 hover:text-gray-200 border border-white/10 hover:border-white/20 px-4 py-2 rounded-md transition-colors"
          >
            💳 課金状況
          </Link>
        </div>
      </div>
    </div>
  );
}
