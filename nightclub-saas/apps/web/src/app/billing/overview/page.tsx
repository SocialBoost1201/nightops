"use client";

import { useState } from "react";

const API_URL = "http://localhost:4000";

export default function BillingOverviewPage() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/billing/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch billing overview. Please check if your token is valid and represents a Tenant Admin.");
      setData(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePayment = async () => {
    if (!data?.plan?.id) {
        alert("現在のプラン情報が見つかりません。SystemAdminからプランを割り当ててください。");
        return;
    }
    try {
      const res = await fetch(`${API_URL}/billing/create-checkout-session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ planId: data.plan.id })
      });
      if (!res.ok) throw new Error("Failed to create checkout session");
      const { url } = await res.json();
      setCheckoutUrl(url);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto font-sans text-gray-800">
      <h1 className="text-3xl font-bold mb-6">テナント課金状況 (Billing Overview)</h1>
      
      <div className="mb-8 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-2">Authentication (Tenant Admin)</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Bearer Token"
            className="border border-gray-300 p-2 w-full max-w-lg rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <button
            onClick={fetchData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            情報を読み込む
          </button>
        </div>
        {error && <p className="text-red-600 mt-2 font-medium">{error}</p>}
      </div>

      {loading && <p className="animate-pulse text-gray-500">Loading data...</p>}

      {!loading && data && (
        <div className="space-y-6">
          
          {data.status === 'past_due' && (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-md">
              <div className="flex items-start">
                <div className="flex-shrink-0 text-xl">⚠️</div>
                <div className="ml-3">
                  <p className="text-sm text-orange-800 font-bold">
                    お支払いが確認できませんでした (Past Due)
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    次回の決済試行も失敗すると、システムのご利用が停止(Suspend)される可能性があります。お早めにクレジットカード情報の更新や、お支払い手続きをお願いいたします。
                  </p>
                </div>
              </div>
            </div>
          )}

          {data.status === 'suspended' && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
              <div className="flex items-start">
                <div className="flex-shrink-0 text-xl">❌</div>
                <div className="ml-3">
                  <p className="text-sm text-red-800 font-bold">
                    サービス利用停止中 (Suspended)
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    お支払いが確認できなかったため、業務データの登録・変更など全ての書き込み操作が制限されています。利用を再開するには、クレジットカード情報を更新してお支払いを完了してください。
                  </p>
                </div>
              </div>
            </div>
          )}

          {data.status === 'canceled' && (
            <div className="bg-gray-100 border-l-4 border-gray-500 p-4 rounded-r-md">
              <div className="flex items-start">
                <div className="flex-shrink-0 text-xl">ℹ️</div>
                <div className="ml-3">
                  <p className="text-sm text-gray-800 font-bold">
                    解約済み (Canceled)
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    契約は解約されています。過去のデータ閲覧などの読み取り専用モードで動作しています。利用を再開するにはサポートまでお問い合わせください。
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-6 border-b pb-2">現在のプラン・契約状態</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
              <div>
                <p className="text-sm text-gray-500 mb-1">ご契約プラン</p>
                <p className="text-lg font-medium text-gray-900">{data.plan?.name || '未契約 (Trial/Free)'}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {data.plan ? `¥${data.plan.price.toLocaleString()} / 月` : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">アカウント状態</p>
                <span className={`inline-block px-3 py-1 rounded text-sm font-bold uppercase tracking-wider
                      ${data.status === 'active' ? 'bg-green-100 text-green-800' :
                        data.status === 'suspended' ? 'bg-red-100 text-red-800' :
                        data.status === 'past_due' ? 'bg-orange-100 text-orange-800' :
                        data.status === 'trial' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                  {data.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">次回請求日 (または期間終了日)</p>
                <p className="text-base font-medium text-gray-900">
                  {data.subscription?.currentPeriodEnd ? new Date(data.subscription.currentPeriodEnd).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">直近の支払い状況</p>
                {data.latestHistory ? (
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${data.latestHistory.status === 'succeeded' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <p className={`text-base font-medium ${data.latestHistory.status === 'succeeded' ? 'text-green-700' : 'text-red-700'}`}>
                      {data.latestHistory.status === 'succeeded' ? '成功' : '失敗'} 
                    </p>
                    <span className="text-gray-500 text-sm">({new Date(data.latestHistory.paidAt).toLocaleDateString()})</span>
                  </div>
                ) : (
                  <p className="text-base font-medium text-gray-400 italic">履歴なし</p>
                )}
              </div>
            </div>

            {data.status !== 'canceled' && (
              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-4">
                <button 
                  onClick={handleUpdatePayment}
                  className="bg-gray-900 text-white px-5 py-2.5 rounded-md font-medium hover:bg-gray-800 transition shadow-sm"
                >
                  {data.status === 'past_due' || data.status === 'suspended' ? 'お支払いの再開・更新' : 'お支払い設定の変更'}
                </button>
                {checkoutUrl && (
                  <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2">
                    Stripe Checkoutを開く ↗
                  </a>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
