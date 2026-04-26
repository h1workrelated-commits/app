import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Package, ShoppingBag, Users, BarChart3, Settings, Share2, ExternalLink, LogOut, Store } from "lucide-react";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Overview", end: true, id: "nav-overview" },
  { to: "/dashboard/products", icon: Package, label: "Products", id: "nav-products" },
  { to: "/dashboard/orders", icon: ShoppingBag, label: "Orders", id: "nav-orders" },
  { to: "/dashboard/customers", icon: Users, label: "Customers", id: "nav-customers" },
  { to: "/dashboard/analytics", icon: BarChart3, label: "Analytics", id: "nav-analytics" },
  { to: "/dashboard/affiliates", icon: Share2, label: "Affiliates", id: "nav-affiliates" },
  { to: "/dashboard/settings", icon: Settings, label: "Settings", id: "nav-settings" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-64 lg:fixed lg:h-screen bg-white border-r border-zinc-100 flex flex-col">
        <div className="px-6 h-16 flex items-center border-b border-zinc-100">
          <Link to="/" className="font-heading text-xl font-bold" data-testid="dashboard-brand-logo">
            stand<span className="text-[#003CFF]">.</span>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-testid={n.id}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? "bg-[#003CFF] text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`
              }
            >
              <n.icon className="w-4 h-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-zinc-100 space-y-1.5">
          {user?.username && (
            <a
              href={`/store/${user.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-zinc-700 hover:bg-zinc-100"
              data-testid="dashboard-view-store"
            >
              <Store className="w-4 h-4" /> View my store <ExternalLink className="w-3 h-3 ml-auto" />
            </a>
          )}
          <button
            onClick={async () => { await logout(); navigate("/"); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-zinc-700 hover:bg-zinc-100"
            data-testid="dashboard-logout-button"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 lg:ml-64 min-h-screen">
        <div className="px-4 sm:px-6 lg:px-10 py-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
