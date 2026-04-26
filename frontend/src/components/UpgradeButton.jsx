import { useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PERKS = [
  "Unlimited items on your board",
  "Custom domain (coming soon)",
  "Remove 'Powered by stand.' footer",
  "Priority support",
];

export default function UpgradeButton({ variant = "sidebar" }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isPro = user?.pro_until && new Date(user.pro_until) > new Date();

  const onUpgrade = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/upgrade/checkout", { origin_url: window.location.origin });
      window.location.href = data.url;
    } catch (e) {
      toast.error(formatApiError(e));
      setLoading(false);
    }
  };

  if (variant === "sidebar") {
    return (
      <>
        {isPro ? (
          <div className="rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 p-3" data-testid="pro-active-badge">
            <div className="flex items-center gap-2 text-amber-800">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-semibold tracking-wider uppercase">Pro active</span>
            </div>
            <p className="text-xs text-amber-700 mt-1">Until {new Date(user.pro_until).toLocaleDateString()}</p>
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="w-full rounded-xl bg-gradient-to-br from-[#003CFF] to-[#1B57FF] text-white p-4 text-left hover:from-[#002ED6] hover:to-[#003CFF] transition-all"
            data-testid="upgrade-pro-button"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-semibold tracking-wider uppercase">Upgrade to Pro</span>
            </div>
            <p className="text-sm font-medium mt-1">$10/mo · build your store</p>
          </button>
        )}

        <UpgradeModal open={open} onOpenChange={setOpen} loading={loading} onUpgrade={onUpgrade} />
      </>
    );
  }

  // inline variant (e.g. landing CTA)
  return (
    <>
      <Button onClick={() => setOpen(true)} className="rounded-full bg-[#003CFF] hover:bg-[#002ED6]" data-testid="upgrade-cta-button">
        Build your store · $10/mo
      </Button>
      <UpgradeModal open={open} onOpenChange={setOpen} loading={loading} onUpgrade={onUpgrade} />
    </>
  );
}

function UpgradeModal({ open, onOpenChange, loading, onUpgrade }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm" data-testid="upgrade-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#003CFF]/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#003CFF]" />
            </div>
            Go Pro
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <div className="flex items-baseline gap-1">
            <span className="font-heading text-5xl font-bold text-zinc-900">$10</span>
            <span className="text-zinc-500">/month</span>
          </div>
          <p className="text-sm text-zinc-500 mt-1">Cancel anytime · Secure via Stripe</p>
          <ul className="mt-5 space-y-2.5">
            {PERKS.map(p => (
              <li key={p} className="flex items-start gap-2 text-sm text-zinc-700">
                <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                {p}
              </li>
            ))}
          </ul>
          <Button onClick={onUpgrade} disabled={loading} className="w-full rounded-full bg-[#003CFF] hover:bg-[#002ED6] h-12 text-base mt-6" data-testid="upgrade-modal-checkout">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening checkout…</> : "Build my store"}
          </Button>
          <p className="text-xs text-zinc-400 text-center mt-3">No commitment. We'll remind you before renewal.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
