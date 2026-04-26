import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, X } from "lucide-react";

const KEY = "stand_growth_dismissed";

export default function GrowthLoop() {
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(KEY)) return;
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(KEY, "1");
    setShow(false);
    setOpen(false);
  };

  if (!show) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-zinc-900 text-white px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.18)] text-sm font-medium animate-in fade-in slide-in-from-bottom-4"
          data-testid="growth-loop-trigger"
        >
          <Sparkles className="w-4 h-4 text-white" />
          Start your own board
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-[0_16px_48px_rgba(0,0,0,0.18)] relative" data-testid="growth-loop-modal">
            <button onClick={dismiss} className="absolute top-4 right-4 p-1 rounded-full hover:bg-zinc-100" data-testid="growth-loop-close">
              <X className="w-4 h-4 text-zinc-500" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-[#003CFF]/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#003CFF]" />
            </div>
            <h3 className="font-heading text-xl font-semibold text-zinc-900 mt-4">Start your own board</h3>
            <p className="text-sm text-zinc-600 mt-2">Sell, share ideas, and collect emails — all from one link.</p>
            <ul className="mt-4 space-y-1.5 text-sm text-zinc-700">
              <li>· 1 month free</li>
              <li>· Cancel anytime</li>
              <li>· No commitment</li>
            </ul>
            <Link to="/signup" onClick={dismiss}>
              <button className="mt-5 w-full rounded-full bg-[#003CFF] hover:bg-[#002ED6] text-white py-3 text-base font-medium" data-testid="growth-loop-cta">
                Start free trial
              </button>
            </Link>
            <p className="text-xs text-zinc-400 text-center mt-3">We'll remind you 3 days before trial ends.</p>
          </div>
        </div>
      )}
    </>
  );
}
