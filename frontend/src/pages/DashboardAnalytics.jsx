import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function DashboardAnalytics() {
  const [stats, setStats] = useState(null);
  useEffect(() => { (async () => {
    try { const { data } = await api.get("/analytics"); setStats(data); } catch {}
  })(); }, []);

  return (
    <div className="space-y-6" data-testid="dashboard-analytics">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-900">Analytics</h1>
        <p className="text-zinc-500 mt-1">Real numbers. No vanity metrics.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Revenue", value: `$${(stats?.total_revenue ?? 0).toFixed(2)}` },
          { label: "Sales", value: stats?.total_sales ?? 0 },
          { label: "Conv. rate", value: `${(stats?.conversion_rate ?? 0).toFixed(1)}%` },
          { label: "Subscribers", value: stats?.subscribers ?? 0 },
        ].map(k => (
          <div key={k.label} className="rounded-2xl bg-white border border-zinc-100 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="text-xs font-semibold tracking-wider uppercase text-zinc-500">{k.label}</div>
            <div className="mt-2 font-heading text-2xl sm:text-3xl font-semibold text-zinc-900">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white border border-zinc-100 p-5 sm:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold text-zinc-900">Revenue (last 14 days)</h2>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats?.trend || []}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#003CFF" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#003CFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F4F4F5" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#71717A" }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E4E4E7" }} />
              <Area type="monotone" dataKey="revenue" stroke="#003CFF" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-zinc-100 p-5 sm:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <h2 className="font-heading text-lg font-semibold text-zinc-900 mb-4">Top products</h2>
        {(stats?.top_products?.length ?? 0) === 0 ? (
          <p className="text-sm text-zinc-500">No sales yet.</p>
        ) : (
          <div className="space-y-2">
            {stats.top_products.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3">
                <div className="text-sm font-medium text-zinc-900 truncate pr-3">{p.title}</div>
                <div className="text-sm text-zinc-700">{p.sales} sales · <span className="font-semibold">${Number(p.revenue).toFixed(2)}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
