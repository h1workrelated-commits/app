import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ShieldCheck, Mail } from "lucide-react";
import { toast } from "sonner";

export default function ProductDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const refCode = params.get("ref") || "";
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [email, setEmail] = useState("");
  const [discount, setDiscount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get(`/products/${id}`); setProduct(data); }
      catch (e) { toast.error(formatApiError(e)); }
      if (refCode) { try { await api.post(`/affiliate/${refCode}/click`); } catch {} }
    })();
  }, [id, refCode]);

  const isFree = product?.type === "lead_magnet" || Number(product?.price) === 0;

  const onBuy = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isFree) {
        await api.post("/subscribe", {
          email, store_username: product.username, product_id: product.id,
        });
        toast.success("Sent to your inbox!");
        setEmail("");
        return;
      }
      const { data } = await api.post("/checkout/create-session", {
        product_id: product.id,
        origin_url: window.location.origin,
        buyer_email: email || null,
        affiliate_code: refCode || null,
        discount_code: discount || null,
      });
      window.location.href = data.url;
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  if (!product) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Loading…</div>;

  return (
    <div className="min-h-screen bg-white" data-testid="product-detail">
      <header className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-zinc-100 z-40">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-zinc-700" data-testid="product-back">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="aspect-square w-full bg-zinc-100 rounded-2xl overflow-hidden">
              {product.image_url
                ? <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" data-testid="product-image" />
                : <div className="w-full h-full flex items-center justify-center text-zinc-400">No image</div>}
            </div>
          </div>
          <div>
            <Link to={`/store/${product.username}`} className="text-xs font-semibold tracking-wider uppercase text-zinc-500 hover:text-[#003CFF]" data-testid="product-back-to-store">
              ← @{product.username}
            </Link>
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900 mt-2" data-testid="product-title">{product.title}</h1>
            <div className="text-2xl font-semibold text-[#003CFF] mt-3" data-testid="product-price">
              {isFree ? "Free" : `$${Number(product.price).toFixed(2)}`}
            </div>
            {product.description && <p className="text-zinc-700 mt-5 leading-relaxed whitespace-pre-line">{product.description}</p>}

            <form onSubmit={onBuy} className="mt-8 space-y-3">
              <div>
                <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Email</Label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="you@email.com" data-testid="product-email-input" />
              </div>
              {!isFree && (
                <div>
                  <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Discount code (optional)</Label>
                  <Input value={discount} onChange={(e) => setDiscount(e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="SAVE10" data-testid="product-discount-input" />
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full rounded-full bg-[#003CFF] hover:bg-[#002ED6] h-12 text-base" data-testid="product-buy-button">
                {loading ? "Processing…" : isFree ? <><Mail className="w-4 h-4 mr-2" /> Get it free</> : "Buy now"}
              </Button>
              <div className="flex items-center gap-2 text-xs text-zinc-500 mt-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Secure checkout via Stripe · Instant delivery
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
