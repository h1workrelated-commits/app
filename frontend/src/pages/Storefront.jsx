import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const TYPE_LABEL = {
  digital: "Digital",
  coaching: "1:1 Call",
  course: "Course",
  lead_magnet: "Free",
  membership: "Membership",
};

export default function Storefront() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { (async () => {
    try { const { data } = await api.get(`/store/${username}`); setData(data); }
    catch (e) { setData({ error: formatApiError(e) }); }
  })(); }, [username]);

  const subscribe = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/subscribe", { email, store_username: username });
      toast.success("You're in! Check your inbox.");
      setEmail("");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSubmitting(false); }
  };

  if (!data) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Loading…</div>;
  if (data.error) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h1 className="font-heading text-3xl font-semibold">Store not found</h1>
      <p className="text-zinc-500 mt-2">@{username} hasn't set up a store yet.</p>
      <Link to="/" className="mt-6 text-[#003CFF] font-medium">Go home →</Link>
    </div>
  );

  const { store, products } = data;
  const featured = products.filter(p => p.featured);
  const others = products.filter(p => !p.featured);
  const accent = store.accent_color || "#003CFF";

  return (
    <div className="min-h-screen bg-white" data-testid="storefront">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-12 pb-20">
        {/* Profile */}
        <div className="text-center" data-testid="storefront-profile">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full mx-auto overflow-hidden bg-zinc-100 ring-4 ring-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            {store.avatar_url
              ? <img src={store.avatar_url} alt={store.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center font-heading text-3xl font-bold text-zinc-400">{store.name?.[0]?.toUpperCase()}</div>}
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mt-5 text-zinc-900">{store.name}</h1>
          <div className="text-sm text-zinc-500 mt-1">@{store.username}</div>
          {store.bio && <p className="text-zinc-700 mt-4 max-w-md mx-auto leading-relaxed">{store.bio}</p>}
          {(store.links || []).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {store.links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold tracking-wider uppercase text-zinc-700 px-3 py-1.5 rounded-full bg-zinc-100">
                  {l.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Featured */}
        {featured.length > 0 && (
          <section className="mt-12">
            <div className="text-xs font-semibold tracking-wider uppercase text-zinc-500 mb-3">Featured</div>
            <div className="space-y-3">
              {featured.map(p => <ProductRow key={p.id} p={p} accent={accent} highlight />)}
            </div>
          </section>
        )}

        {/* All products */}
        {others.length > 0 && (
          <section className="mt-10">
            <div className="text-xs font-semibold tracking-wider uppercase text-zinc-500 mb-3">All products</div>
            <div className="space-y-3">
              {others.map(p => <ProductRow key={p.id} p={p} accent={accent} />)}
            </div>
          </section>
        )}

        {products.length === 0 && (
          <div className="mt-12 rounded-2xl border border-dashed border-zinc-200 p-10 text-center text-zinc-500" data-testid="storefront-empty">
            No products yet.
          </div>
        )}

        {/* Email capture */}
        <section className="mt-12 rounded-3xl bg-zinc-50 border border-zinc-100 p-6 sm:p-8 text-center">
          <h2 className="font-heading text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">Stay in the loop</h2>
          <p className="text-sm text-zinc-600 mt-1">Get new drops and offers from {store.name}.</p>
          <form onSubmit={subscribe} className="mt-4 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="h-11 rounded-xl bg-white" data-testid="storefront-subscribe-email" />
            <Button type="submit" disabled={submitting} className="rounded-full h-11 px-6" style={{ backgroundColor: accent }} data-testid="storefront-subscribe-button">
              {submitting ? "…" : "Subscribe"}
            </Button>
          </form>
        </section>

        {/* Testimonials */}
        {(store.testimonials || []).length > 0 && (
          <section className="mt-12">
            <div className="text-xs font-semibold tracking-wider uppercase text-zinc-500 mb-3">Loved by</div>
            <div className="space-y-3">
              {store.testimonials.map((t, i) => (
                <div key={i} className="rounded-2xl border border-zinc-100 bg-white p-5">
                  <p className="text-sm text-zinc-700">"{t.quote}"</p>
                  <div className="mt-2 text-xs text-zinc-500">— {t.name}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {(store.faqs || []).length > 0 && (
          <section className="mt-12">
            <div className="text-xs font-semibold tracking-wider uppercase text-zinc-500 mb-3">FAQ</div>
            <Accordion type="single" collapsible className="rounded-2xl border border-zinc-100 bg-white px-4">
              {store.faqs.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger>{f.q}</AccordionTrigger>
                  <AccordionContent>{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        )}

        <footer className="mt-16 text-center text-xs text-zinc-400">
          Powered by <Link to="/" className="text-zinc-600 font-semibold">stand.</Link>
        </footer>
      </div>
    </div>
  );
}

function ProductRow({ p, accent, highlight }) {
  const isFree = p.type === "lead_magnet" || Number(p.price) === 0;
  return (
    <Link
      to={`/product/${p.id}`}
      className={`block rounded-2xl border bg-white p-4 sm:p-5 lift-on-hover ${highlight ? "border-zinc-200 shadow-[0_8px_24px_rgba(0,0,0,0.06)]" : "border-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"}`}
      data-testid={`store-product-${p.id}`}
    >
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-zinc-100 overflow-hidden flex-shrink-0">
          {p.image_url
            ? <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-zinc-400" /></div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold tracking-wider uppercase" style={{ color: accent }}>{TYPE_LABEL[p.type]}</div>
          <div className="font-heading font-semibold text-zinc-900 truncate">{p.title}</div>
          {p.description && <div className="text-sm text-zinc-500 truncate">{p.description}</div>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="font-semibold text-zinc-900">{isFree ? "Free" : `$${Number(p.price).toFixed(2)}`}</div>
          <ArrowRight className="w-4 h-4 text-zinc-400" />
        </div>
      </div>
    </Link>
  );
}
