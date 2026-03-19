"use client";

import { useState } from "react";

const API_URL = "http://localhost:4000";

export default function BillingHistoryPage() {
  const [token, setToken] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/billing/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch billing history. Please check if your token is valid.");
      setRecords(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto font-sans text-gray-800">
      <h1 className="text-3xl font-bold mb-6">課金・請求履歴 (Billing History)</h1>
      
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

      {loading && <p className="animate-pulse text-gray-500">Loading history data...</p>}

      {!loading && records.length === 0 && !error && token && (
        <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-500">課金履歴がありません。</p>
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 py-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
                <th className="p-4 font-medium">請求日 (決済日時)</th>
                <th className="p-4 font-medium">金額</th>
                <th className="p-4 font-medium">状態</th>
                <th className="p-4 font-medium">ID (リファレンス)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map(record => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 align-middle">
                    <span className="text-gray-900 font-medium">
                      {new Date(record.paidAt).toLocaleDateString()}
                    </span>
                    <span className="text-gray-500 text-xs ml-2">
                      {new Date(record.paidAt).toLocaleTimeString()}
                    </span>
                  </td>
                  <td className="p-4 align-middle font-medium">
                    ¥{record.amount.toLocaleString()}
                  </td>
                  <td className="p-4 align-middle">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                      ${record.status === 'succeeded' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {record.status === 'succeeded' ? '支払い済み' : '決済失敗'}
                    </span>
                  </td>
                  <td className="p-4 align-middle text-sm text-gray-500 font-mono">
                    ...{record.id.slice(-8)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
