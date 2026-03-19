"use client";

import { useState } from "react";

const API_URL = "http://localhost:4000/system";

export default function SystemAdminTenantsPage() {
  const [token, setToken] = useState("");
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tenantsRes, plansRes] = await Promise.all([
        fetch(`${API_URL}/tenants`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/plans`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!tenantsRes.ok) throw new Error("Failed to fetch tenants (Check token role)");
      if (!plansRes.ok) throw new Error("Failed to fetch plans");

      setTenants(await tenantsRes.json());
      setPlans(await plansRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_URL}/tenants/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Update failed");
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans text-gray-800">
      <h1 className="text-3xl font-bold mb-6">SaaS System Admin Console</h1>
      
      <div className="mb-8 p-4 bg-gray-100 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-2">Authentication</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Bearer Token (SystemAdmin Role)"
            className="border border-gray-300 p-2 w-full max-w-lg rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <button
            onClick={fetchData}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Load Data
          </button>
        </div>
        {error && <p className="text-red-600 mt-2 font-medium">{error}</p>}
      </div>

      {loading && <p className="animate-pulse text-gray-500">Loading data...</p>}

      {!loading && tenants.length > 0 && (
        <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                <th className="p-4 font-medium">Tenant Name</th>
                <th className="p-4 font-medium">Plan</th>
                <th className="p-4 font-medium">Tenant Status</th>
                <th className="p-4 font-medium">Sub Status</th>
                <th className="p-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tenants.map(tenant => (
                <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 align-top">
                    <div className="font-semibold text-gray-900">{tenant.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{tenant.id}</div>
                  </td>
                  <td className="p-4 align-top">
                    {tenant.plan?.name ? (
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">{tenant.plan.name}</span>
                    ) : (
                      <span className="text-gray-400 italic">No Plan</span>
                    )}
                  </td>
                  <td className="p-4 align-top">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider
                      ${tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                        tenant.status === 'suspended' ? 'bg-red-100 text-red-800' :
                        tenant.status === 'past_due' ? 'bg-orange-100 text-orange-800' :
                        tenant.status === 'trial' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="p-4 align-top">
                    {tenant.subscription?.status ? (
                      <span className="text-sm font-medium">{tenant.subscription.status}</span>
                    ) : (
                      <span className="text-gray-400 italic">-</span>
                    )}
                  </td>
                  <td className="p-4 align-top text-center">
                    <div className="flex justify-center gap-2">
                      {tenant.status !== 'suspended' && (
                        <button
                          onClick={() => updateStatus(tenant.id, 'suspended')}
                          className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded text-sm hover:bg-red-100 transition whitespace-nowrap"
                        >
                          Suspend (利用停止)
                        </button>
                      )}
                      {tenant.status === 'suspended' && (
                        <button
                          onClick={() => updateStatus(tenant.id, 'active')}
                          className="bg-green-50 text-green-600 border border-green-200 px-3 py-1 rounded text-sm hover:bg-green-100 transition whitespace-nowrap"
                        >
                          Activate (復帰)
                        </button>
                      )}
                    </div>
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
