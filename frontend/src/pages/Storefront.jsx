import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { track, trackBeacon } from "@/lib/telemetry";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, ArrowRight, Mail, ShoppingBag, Heart } from "lucide-react";
import LeadCaptureModal from "@/components/LeadCaptureModal";
import GrowthLoop from "@/components/GrowthLoop";

export default function Storefront() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadItem, setLeadItem] = useState(null);
  const navigate = useNavigate();
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/board/${username}`);
        if (!cancelled) setData(data);
        track("view", { board_username: username });
      } catch (e) {
        if (!cancelled) setData({ error: formatApiError(e) });
      }
    })();
    const onLeave = () => {
      const ms = Date.now() - startedAt.current;
      trackBeacon("time_spent", { board_username: username, time_ms: ms });
    };
    window.addEventListener("beforeunload", onLeave);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") onLeave();
    });
    return () => {
      cancelled = true;
      window.removeEventListener("beforeunload", onLeave);
      onLeave();
    };
  }, [username]);

  if (!data) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Loading…</div>;
  if (data.error) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h1 className="font-heading text-3xl font-semibold">Board not found</h1>
      <p className="text-zinc-500 mt-2">@{username} hasn't set up a board yet.</p>
      <Link to="/" className="mt-6 text-[#003CFF] font-medium" data-testid="board-home-link">Go home →</Link>
    </div>
  );

  const { store, products } = data;
  const accent = store.accent_color || "#003CFF";

  const onItemAction = (item) => {
    track("cta_click", { item_id: item.id, board_username: username });
    const isWaitlist = item.cta_type === "waitlist" || item.type === "lead_magnet";
    if (isWaitlist) {
      setLeadItem(item);
      setLeadOpen(true);
    } else {
      navigate(`/item/${item.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-white" data-testid="board-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-12 pb-24">
        {/* Profile */}
        <div className="text-center" data-testid="board-profile">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full mx-auto overflow-hidden bg-zinc-100 ring-4 ring-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            {store.avatar_url
              ? <img src={store.avatar_url} alt={store.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center font-heading text-3xl font-bold text-zinc-400">{store.name?.[0]?.toUpperCase()}</div>}
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mt-5 text-zinc-900" data-testid="board-name">{store.name}</h1>
          <div className="text-sm text-zinc-500 mt-1">@{store.username}</div>
          {store.bio && <p className="text-zinc-700 mt-4 max-w-md mx-auto leading-relaxed">{store.bio}</p>}
        </div>

        {/* Items */}
        {products.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-zinc-200 p-10 text-center text-zinc-500" data-testid="board-empty">
            No items yet.
          </div>
        ) : (
          <section className="mt-10 space-y-3">
            {products.map(p => (
              <ItemCard key={p.id} item={p} accent={accent} username={username} onAction={() => onItemAction(p)} />
            ))}
          </section>
        )}

        <footer className="mt-16 text-center text-xs text-zinc-400">
          Powered by <Link to="/" className="text-zinc-600 font-semibold">stand.</Link>
        </footer>
      </div>

      <LeadCaptureModal open={leadOpen} onOpenChange={setLeadOpen} item={leadItem} boardUsername={username} accent={accent} />
      <GrowthLoop />
    </div>
  );
}

function ItemCard({ item, accent, username, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const isWaitlist = item.cta_type === "waitlist" || item.type === "lead_magnet";
  const isSupport = item.cta_type === "support";
  const price = Number(item.price || 0);
  const ctaLabel = item.cta_text || (isWaitlist ? "Join waitlist" : isSupport ? "Support" : "Buy");
  const ctaIcon = isWaitlist ? Mail : isSupport ? Heart : ShoppingBag;
  const Icon = ctaIcon;
  const oneLiner = item.one_liner || item.description || "";
  const hasMore = item.description && item.description !== oneLiner;

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]" data-testid={`board-item-${item.id}`}>
      {item.image_url && (
        <div className="aspect-video w-full bg-zinc-100 rounded-xl overflow-hidden mb-4">
          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-heading font-bold text-lg text-zinc-900" data-testid={`item-title-${item.id}`}>{item.title}</h3>
          {oneLiner && <p className="text-sm text-zinc-700 mt-1 leading-relaxed">{oneLiner}</p>}
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
              data-testid={`item-expand-${item.id}`}
            >
              {expanded ? <>Less <ChevronUp className="w-3 h-3" /></> : <>Learn more <ChevronDown className="w-3 h-3" /></>}
            </button>
          )}
          {expanded && hasMore && (
            <p className="mt-3 text-sm text-zinc-600 leading-relaxed whitespace-pre-line">{item.description}</p>
          )}
        </div>
        {!isWaitlist && price > 0 && (
          <div className="font-semibold text-zinc-900 text-base flex-shrink-0">${price.toFixed(2)}</div>
        )}
      </div>
      <button
        onClick={onAction}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full text-white py-3 font-medium text-sm transition-opacity hover:opacity-90"
        style={{ backgroundColor: accent }}
        data-testid={`item-cta-${item.id}`}
      >
        <Icon className="w-4 h-4" /> {ctaLabel} <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
