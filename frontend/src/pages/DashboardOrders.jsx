import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function DashboardOrders() {
  const [orders, setOrders] = useState([]);
  useEffect(() => { (async () => {
    try { const { data } = await api.get("/orders"); setOrders(data); } catch {}
  })(); }, []);

  return (
    <div className="space-y-6" data-testid="dashboard-orders">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-900">Orders</h1>
        <p className="text-zinc-500 mt-1">All your sales in one place.</p>
      </div>
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-12 text-center text-zinc-500" data-testid="empty-orders">
          No orders yet. Once buyers pay, they'll appear here.
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-zinc-100 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="grid grid-cols-4 px-5 py-3 text-xs font-semibold tracking-wider uppercase text-zinc-500 border-b border-zinc-100 bg-zinc-50">
            <div>Date</div><div>Product</div><div>Buyer</div><div className="text-right">Amount</div>
          </div>
          {orders.map(o => (
            <div key={o.id} className="grid grid-cols-4 px-5 py-4 text-sm border-b border-zinc-50 last:border-0" data-testid={`order-row-${o.id}`}>
              <div className="text-zinc-700">{new Date(o.created_at).toLocaleDateString()}</div>
              <div className="text-zinc-900 font-medium truncate">{o.product_title}</div>
              <div className="text-zinc-700 truncate">{o.buyer_email}</div>
              <div className="text-right font-semibold text-zinc-900">${Number(o.amount).toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
