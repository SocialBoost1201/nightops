"use client";

import { useState, useEffect, use } from "react";
import Link from 'next/link';

const API_URL = "http://localhost:4000/system";

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const tenantId = unwrappedParams.id;
  const [token, setToken] = useState("");
  const [tenant, setTenant] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tenantRes, plansRes] = await Promise.all([
        fetch(`${API_URL}/tenants/${tenantId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/plans`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!tenantRes.ok) throw new Error("Failed to fetch tenant details.");
      if (!plansRes.ok) throw new Error("Failed to fetch plans");

      setTenant(await tenantRes.json());
      setPlans(await plansRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`${API_URL}/tenants/${tenantId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Status update failed");
      await fetchData(); // refresh
    } catch (err: any) {
      alert(err.message);
    }
  };

  const updatePlan = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPlanId = e.target.value;
    try {
      const res = await fetch(`${API_URL}/tenants/${tenantId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ planId: newPlanId })
      });
      if (!res.ok) throw new Error("Plan update failed");
      await fetchData(); // refresh
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans text-gray-800">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tenant Detail Overview</h1>
        <Link href="/system/tenants" className="text-blue-600 hover:underline">
          &larr; Back to Tenant List
        </Link>
      </div>
      
      <div className="mb-8 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-2">Authentication (System Admin)</h2>
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
            Load Details
          </button>
        </div>
        {error && <p className="text-red-600 mt-2 font-medium">{error}</p>}
      </div>

      {loading && <p className="animate-pulse text-gray-500">Loading data...</p>}

      {!loading && tenant && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="space-y-8">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Tenant Name</p>
                  <p className="text-base font-medium">{tenant.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Tenant ID</p>
                  <p className="text-sm font-mono text-gray-600">{tenant.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Application Status</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider
                        ${tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                          tenant.status === 'suspended' ? 'bg-red-100 text-red-800' :
                          tenant.status === 'past_due' ? 'bg-orange-100 text-orange-800' :
                          tenant.status === 'trial' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                      {tenant.status}
                    </span>
                    <div className="flex gap-2">
                        {tenant.status !== 'suspended' && (
                          <button onClick={() => updateStatus('suspended')} className="text-xs border border-red-300 text-red-600 px-2 py-1 rounded hover:bg-red-50">Force Suspend</button>
                        )}
                        {tenant.status === 'suspended' && (
                          <button onClick={() => updateStatus('active')} className="text-xs border border-green-300 text-green-600 px-2 py-1 rounded hover:bg-green-50">Force Activate</button>
                        )}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Stripe Customer ID</p>
                  <p className="text-sm font-mono text-gray-600">{tenant.stripeCustomerId || '-'}</p>
                </div>
              </div>
            </div>

            {/* Plan Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">SaaS Subscription & Plan</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Current Plan</p>
                  <select 
                    value={tenant.planId || ''} 
                    onChange={updatePlan}
                    className="mt-1 block w-full border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm border"
                  >
                    <option value="" disabled>No Plan Assigned</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (¥{p.price})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Stripe Subscription Status</p>
                  <p className="text-base">{tenant.subscription?.status || 'No active Stripe Subscription'}</p>
                </div>
                {tenant.subscription && (
                  <>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Period Start</p>
                      <p className="text-sm">{new Date(tenant.subscription.currentPeriodStart).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Period End</p>
                      <p className="text-sm">{new Date(tenant.subscription.currentPeriodEnd).toLocaleString()}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Billing History (Last 10) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">Recent Billing History</h3>
              {tenant.billingHistory && tenant.billingHistory.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {tenant.billingHistory.map((history: any) => (
                    <li key={history.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">¥{history.amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{new Date(history.paidAt).toLocaleString()}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${history.status === 'succeeded' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {history.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No billing history recorded.</p>
              )}
            </div>

            {/* Webhook Events Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold border-b pb-2 mb-4">Recent System Webhooks</h3>
              <p className="text-xs text-gray-500 mb-4">Note: These are global recent Stripe events recorded by the webhook system, showing overall webhook health.</p>
              {tenant.recentWebhooks && tenant.recentWebhooks.length > 0 ? (
                <ul className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                  {tenant.recentWebhooks.map((wh: any) => (
                    <li key={wh.id} className="py-2">
                       <p className="text-sm font-medium text-gray-900">{wh.type}</p>
                       <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-gray-500 font-mono" title={wh.id}>{wh.id.split('_').pop()}</p>
                          <span className="text-xs text-gray-500">{new Date(wh.createdAt).toLocaleString()}</span>
                       </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">No recent webhooks.</p>
              )}
            </div>
          </div>
        
        </div>
      )}
    </div>
  );
}
