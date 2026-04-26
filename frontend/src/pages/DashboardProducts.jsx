import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, ExternalLink, ShoppingBag, Lightbulb, Heart, Mail } from "lucide-react";
import { toast } from "sonner";
import QuickCreate from "@/components/QuickCreate";

const empty = {
  kind: "sell", // sell | idea
  cta_type: "buy", // buy | waitlist | support
  title: "", description: "", one_liner: "",
  price: 0, image_url: "", file_url: "",
  is_active: true,
};

export default function DashboardProducts() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { const { data } = await api.get("/products"); setItems(data); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p) => {
    const isIdea = p.cta_type === "waitlist" || p.cta_type === "support" || p.type === "lead_magnet";
    setEditing(p.id);
    setForm({
      kind: isIdea ? "idea" : "sell",
      cta_type: p.cta_type || (p.type === "lead_magnet" ? "waitlist" : "buy"),
      title: p.title, description: p.description || "", one_liner: p.one_liner || "",
      price: p.price, image_url: p.image_url || "", file_url: p.file_url || "",
      is_active: !!p.is_active,
    });
    setOpen(true);
  };

  const onSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const isIdea = form.kind === "idea";
      const cta_type = isIdea ? form.cta_type : "buy";
      const type = isIdea && cta_type === "waitlist" ? "lead_magnet" : "digital";
      const payload = {
        type,
        cta_type,
        title: form.title,
        description: form.description,
        one_liner: form.one_liner,
        price: cta_type === "waitlist" ? 0 : (parseFloat(form.price) || 0),
        image_url: form.image_url,
        file_url: form.file_url,
        is_active: form.is_active,
      };
      if (editing) await api.put(`/products/${editing}`, payload);
      else await api.post("/products", payload);
      toast.success(editing ? "Updated" : "Live on your board");
      setOpen(false); setForm(empty); setEditing(null);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try { await api.delete(`/products/${id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-6 pb-24" data-testid="dashboard-items">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-900">Items</h1>
          <p className="text-zinc-500 mt-1">Everything on your board.</p>
        </div>
        <Button onClick={openCreate} variant="outline" className="rounded-full border-2" data-testid="open-create-item">
          <Plus className="w-4 h-4 mr-1" /> Manual
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle className="font-heading">{editing ? "Edit item" : "New item"}</DialogTitle></DialogHeader>
          <form onSubmit={onSave} className="space-y-4 mt-2">
            {/* Kind toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-100">
              {[
                { v: "sell", l: "Sell", icon: ShoppingBag },
                { v: "idea", l: "Idea", icon: Lightbulb },
              ].map(o => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setForm({ ...form, kind: o.v, cta_type: o.v === "idea" ? "waitlist" : "buy" })}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${form.kind === o.v ? "bg-white shadow-sm text-zinc-900" : "text-zinc-600"}`}
                  data-testid={`item-kind-${o.v}`}
                >
                  <o.icon className="w-4 h-4" /> {o.l}
                </button>
              ))}
            </div>

            <div>
              <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Title</Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5 h-11 rounded-xl" data-testid="item-title-input" />
            </div>
            <div>
              <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">One-liner</Label>
              <Input value={form.one_liner} onChange={(e) => setForm({ ...form, one_liner: e.target.value })} className="mt-1.5 h-11 rounded-xl" placeholder="One short sentence" data-testid="item-oneliner-input" />
            </div>
            <div>
              <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Long description (optional)</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 rounded-xl min-h-20" data-testid="item-description-input" />
            </div>
            <div>
              <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Cover image URL (optional)</Label>
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="mt-1.5 h-11 rounded-xl" placeholder="https://..." data-testid="item-image-input" />
            </div>

            {form.kind === "sell" && (
              <>
                <div>
                  <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Price (USD)</Label>
                  <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1.5 h-11 rounded-xl" data-testid="item-price-input" />
                </div>
                <div>
                  <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Delivery file or link (optional)</Label>
                  <Input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} className="mt-1.5 h-11 rounded-xl" placeholder="https://..." data-testid="item-file-input" />
                </div>
              </>
            )}

            {form.kind === "idea" && (
              <div>
                <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">CTA</Label>
                <div className="mt-1.5 grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-100">
                  {[
                    { v: "waitlist", l: "Waitlist", icon: Mail },
                    { v: "support", l: "Support", icon: Heart },
                  ].map(o => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setForm({ ...form, cta_type: o.v })}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${form.cta_type === o.v ? "bg-white shadow-sm text-zinc-900" : "text-zinc-600"}`}
                      data-testid={`item-cta-${o.v}`}
                    >
                      <o.icon className="w-4 h-4" /> {o.l}
                    </button>
                  ))}
                </div>
                {form.cta_type === "support" && (
                  <div className="mt-3">
                    <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Support amount (USD)</Label>
                    <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1.5 h-11 rounded-xl" data-testid="item-support-amount-input" />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label className="text-sm">Visible on board</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} data-testid="item-active-switch" />
            </div>
            <Button type="submit" disabled={saving} className="w-full rounded-full bg-[#003CFF] hover:bg-[#002ED6] h-11" data-testid="item-save-button">
              {saving ? "Saving…" : "Save"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-12 text-center text-zinc-500" data-testid="empty-items">
          <Plus className="w-8 h-8 mx-auto text-zinc-300" />
          <p className="mt-3">No items yet. Hit the spark button below to publish your first idea in seconds.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(p => {
            const isIdea = p.cta_type === "waitlist" || p.cta_type === "support" || p.type === "lead_magnet";
            const tag = p.cta_type === "waitlist" || p.type === "lead_magnet" ? "Waitlist" : p.cta_type === "support" ? "Support" : "Sell";
            return (
              <div key={p.id} className="rounded-2xl bg-white border border-zinc-100 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]" data-testid={`item-card-${p.id}`}>
                {p.image_url && (
                  <div className="aspect-video bg-zinc-100 overflow-hidden">
                    <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold tracking-wider uppercase ${isIdea ? "text-amber-600" : "text-[#003CFF]"}`}>{tag}</div>
                      <div className="font-heading font-semibold text-zinc-900 truncate">{p.title}</div>
                      {p.one_liner && <div className="text-xs text-zinc-500 truncate mt-0.5">{p.one_liner}</div>}
                    </div>
                    {!isIdea && Number(p.price) > 0 && <div className="text-[#003CFF] font-semibold">${Number(p.price).toFixed(2)}</div>}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-1">
                    <div className="text-xs text-zinc-500">{p.view_count || 0} views · {(p.email_submits || 0) + (p.sales_count || 0)} conversions</div>
                    <div className="flex gap-1">
                      <Link to={`/item/${p.id}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-zinc-100" data-testid={`item-open-${p.id}`}>
                        <ExternalLink className="w-4 h-4 text-zinc-600" />
                      </Link>
                      <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-zinc-100" data-testid={`item-edit-${p.id}`}>
                        <Pencil className="w-4 h-4 text-zinc-600" />
                      </button>
                      <button onClick={() => onDelete(p.id)} className="p-2 rounded-lg hover:bg-zinc-100" data-testid={`item-delete-${p.id}`}>
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <QuickCreate onCreated={load} />
    </div>
  );
}
