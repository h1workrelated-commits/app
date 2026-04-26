import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function Checkout() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState({ loading: true, status: null, info: null, error: null });
  const attempts = useRef(0);

  useEffect(() => {
    if (!sessionId) {
      setState({ loading: false, status: "missing", info: null, error: "No session" });
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const { data } = await api.get(`/checkout/status/${sessionId}`);
        if (cancelled) return;
        if (data.payment_status === "paid") {
          setState({ loading: false, status: "paid", info: data, error: null });
          return;
        }
        if (data.status === "expired") {
          setState({ loading: false, status: "expired", info: data, error: null });
          return;
        }
        attempts.current += 1;
        if (attempts.current >= 8) {
          setState({ loading: false, status: "pending", info: data, error: "Timeout — check your email" });
          return;
        }
        setTimeout(poll, 2000);
      } catch (e) {
        if (!cancelled) setState({ loading: false, status: "error", info: null, error: e.message });
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full text-center" data-testid="checkout-result">
        {state.loading && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-[#003CFF] mx-auto" />
            <h1 className="font-heading text-2xl font-semibold mt-5">Confirming your payment…</h1>
            <p className="text-zinc-500 mt-2 text-sm">Hang tight, this should only take a moment.</p>
          </>
        )}
        {state.status === "paid" && (
          <>
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
            <h1 className="font-heading text-3xl font-semibold mt-5" data-testid="checkout-success">Payment received!</h1>
            <p className="text-zinc-600 mt-2">A confirmation has been sent to your email.</p>
            <Link to="/" className="inline-block mt-6">
              <Button className="rounded-full bg-[#003CFF] hover:bg-[#002ED6]">Back home</Button>
            </Link>
          </>
        )}
        {(state.status === "expired" || state.status === "error" || state.status === "missing") && (
          <>
            <XCircle className="w-14 h-14 text-rose-500 mx-auto" />
            <h1 className="font-heading text-3xl font-semibold mt-5" data-testid="checkout-failed">Something went wrong</h1>
            <p className="text-zinc-600 mt-2">{state.error || "Please try again."}</p>
            <Link to="/" className="inline-block mt-6">
              <Button variant="outline" className="rounded-full">Back home</Button>
            </Link>
          </>
        )}
        {state.status === "pending" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-zinc-400 mx-auto" />
            <h1 className="font-heading text-2xl font-semibold mt-5">Still processing…</h1>
            <p className="text-zinc-500 mt-2 text-sm">Your email will confirm once payment clears.</p>
          </>
        )}
      </div>
    </div>
  );
}
