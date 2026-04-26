import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { track, trackBeacon } from "@/lib/telemetry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ShieldCheck, Mail, Heart, ShoppingBag } from "lucide-react";
import LeadCaptureModal from "@/components/LeadCaptureModal";
import { toast } from "sonner";

export default function ProductDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const refCode = params.get("ref") || "";
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/products/${id}`);
        setProduct(data);
        track("view", { item_id: id, board_username: data.username });
      } catch (e) { toast.error(formatApiError(e)); }
      if (refCode) { try { await api.post(`/affiliate/${refCode}/click`); } catch {} }
    })();
    const onLeave = () => trackBeacon("time_spent", { item_id: id, time_ms: Date.now() - startedAt.current });
    return () => onLeave();
  }, [id, refCode]);

  if (!product) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Loading…</div>;

  const isWaitlist = product.cta_type === "waitlist" || product.type === "lead_magnet";
  const isSupport = product.cta_type === "support";
  const price = Number(product.price || 0);
  const ctaLabel = product.cta_text || (isWaitlist ? "Get notified" : isSupport ? "Support this" : "Buy now");
  const Icon = isWaitlist ? Mail : isSupport ? Heart : ShoppingBag;

  const onBuy = async (e) => {
    e.preventDefault();
    track("cta_click", { item_id: product.id, board_username: product.username });
    if (isWaitlist) {
      setLeadOpen(true);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/checkout/create-session", {
        product_id: product.id,
        origin_url: window.location.origin,
        buyer_email: email || null,
        affiliate_code: refCode || null,
      });
      window.location.href = data.url;
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white" data-testid="item-page">
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-zinc-100 z-40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-zinc-700" data-testid="item-back">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="aspect-square w-full bg-zinc-100 rounded-2xl overflow-hidden">
              {product.image_url
                ? <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-zinc-400">No image</div>}
            </div>
          </div>
          <div>
            <Link to={`/board/${product.username}`} className="text-xs font-semibold tracking-wider uppercase text-zinc-500 hover:text-[#003CFF]" data-testid="item-back-to-board">
              ← @{product.username}
            </Link>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 mt-2" data-testid="item-title">{product.title}</h1>
            {product.one_liner && <p className="text-zinc-700 mt-2 text-base leading-relaxed">{product.one_liner}</p>}
            {!isWaitlist && price > 0 && <div className="text-2xl font-semibold text-[#003CFF] mt-3" data-testid="item-price">${price.toFixed(2)}</div>}
            {product.description && product.description !== product.one_liner && (
              <p className="text-zinc-600 mt-5 leading-relaxed whitespace-pre-line text-sm">{product.description}</p>
            )}

            <form onSubmit={onBuy} className="mt-8 space-y-3">
              {!isWaitlist && (
                <div>
                  <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Email</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="you@email.com" data-testid="item-email-input" />
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full rounded-full bg-[#003CFF] hover:bg-[#002ED6] h-12 text-base" data-testid="item-buy-button">
                <Icon className="w-4 h-4 mr-2" /> {loading ? "Processing…" : ctaLabel}
              </Button>
              <div className="flex items-center gap-2 text-xs text-zinc-500 mt-2">
                <ShieldCheck className="w-3.5 h-3.5" /> {isWaitlist ? "No spam. Unsubscribe anytime." : "Secure checkout via Stripe"}
              </div>
            </form>
          </div>
        </div>
      </div>

      <LeadCaptureModal open={leadOpen} onOpenChange={setLeadOpen} item={product} boardUsername={product.username} />
    </div>
  );
}
