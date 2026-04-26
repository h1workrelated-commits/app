import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Package, ShoppingBag, DollarSign, Eye, Copy, Plus } from "lucide-react";
import { toast } from "sonner";

function KPI({ label, value, icon: Icon, accent }) {
  return (
    <div className="rounded-2xl bg-white border border-zinc-100 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase text-zinc-500">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3 font-heading text-3xl font-semibold tracking-tight text-zinc-900">{value}</div>
    </div>
  );
}

export default function DashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/analytics");
        setStats(data);
      } catch {}
    })();
  }, []);

  const storeUrl = user?.username ? `${window.location.origin}/store/${user.username}` : "";

  return (
    <div className="space-y-8" data-testid="dashboard-home">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900">Hi, {user?.name} 👋</h1>
          <p className="text-zinc-500 mt-1">Here's how your store is doing today.</p>
        </div>
        <Link to="/dashboard/products" data-testid="dashboard-add-product-cta">
          <Button className="rounded-full bg-[#003CFF] hover:bg-[#002ED6]"><Plus className="w-4 h-4 mr-1" /> Add product</Button>
        </Link>
      </div>

      {/* Store link card */}
      <div className="rounded-2xl bg-zinc-900 text-white p-6 sm:p-7 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-semibold tracking-wider uppercase text-zinc-400">Your store</div>
          <div className="mt-1 font-heading text-lg sm:text-xl break-all" data-testid="dashboard-store-url">{storeUrl}</div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-full border-white/20 bg-white/0 text-white hover:bg-white/10 hover:text-white"
            onClick={() => { navigator.clipboard.writeText(storeUrl); toast.success("Link copied"); }}
            data-testid="copy-store-link"
          >
            <Copy className="w-4 h-4 mr-1" /> Copy
          </Button>
          <a href={storeUrl} target="_blank" rel="noopener noreferrer" data-testid="open-store-link">
            <Button className="rounded-full bg-white text-zinc-900 hover:bg-zinc-200">Open <ArrowUpRight className="w-4 h-4 ml-1" /></Button>
          </a>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Revenue" value={`$${(stats?.total_revenue ?? 0).toFixed(2)}`} icon={DollarSign} accent="bg-[#003CFF]/10 text-[#003CFF]" />
        <KPI label="Sales" value={stats?.total_sales ?? 0} icon={ShoppingBag} accent="bg-emerald-50 text-emerald-600" />
        <KPI label="Views" value={stats?.total_views ?? 0} icon={Eye} accent="bg-amber-50 text-amber-600" />
        <KPI label="Conv. rate" value={`${(stats?.conversion_rate ?? 0).toFixed(1)}%`} icon={Package} accent="bg-rose-50 text-rose-600" />
      </div>

      <div className="rounded-2xl bg-white border border-zinc-100 p-6 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <h2 className="font-heading text-xl font-semibold text-zinc-900">Quick start</h2>
        <ol className="mt-4 space-y-3 text-sm text-zinc-700">
          <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-[#003CFF] text-white flex items-center justify-center text-xs font-semibold">1</span> Add your first product</li>
          <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-[#003CFF] text-white flex items-center justify-center text-xs font-semibold">2</span> Customize your storefront in Settings</li>
          <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-[#003CFF] text-white flex items-center justify-center text-xs font-semibold">3</span> Share your store link and start selling</li>
        </ol>
      </div>
    </div>
  );
}
