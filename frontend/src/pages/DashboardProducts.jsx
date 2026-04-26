import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const TYPES = [
  { value: "digital", label: "Digital download" },
  { value: "coaching", label: "Coaching session" },
  { value: "course", label: "Course" },
  { value: "lead_magnet", label: "Lead magnet (free)" },
  { value: "membership", label: "Membership (recurring)" },
];

const empty = {
  type: "digital", title: "", description: "", price: 0,
  image_url: "", file_url: "", category: "", featured: false,
  is_active: true, recurring: false,
};

export default function DashboardProducts() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/products");
      setItems(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p) => {
    setEditing(p.id);
    setForm({
      type: p.type, title: p.title, description: p.description || "",
      price: p.price, image_url: p.image_url || "", file_url: p.file_url || "",
      category: p.category || "", featured: !!p.featured, is_active: !!p.is_active,
      recurring: !!p.recurring,
    });
    setOpen(true);
  };

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, price: parseFloat(form.price) || 0 };
      if (editing) await api.put(`/products/${editing}`, payload);
      else await api.post("/products", payload);
      toast.success(editing ? "Product updated" : "Product created");
      setOpen(false); setForm(empty); setEditing(null);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try { await api.delete(`/products/${id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-6" data-testid="dashboard-products">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-900">Products</h1>
          <p className="text-zinc-500 mt-1">Everything you sell, in one place.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="rounded-full bg-[#003CFF] hover:bg-[#002ED6]" data-testid="open-create-product">
              <Plus className="w-4 h-4 mr-1" /> New product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg rounded-2xl">
            <DialogHeader><DialogTitle className="font-heading">{editing ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
            <form onSubmit={onSave} className="space-y-4 mt-2">
              <div>
                <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, recurring: v === "membership" })}>
                  <SelectTrigger className="mt-1.5 h-11 rounded-xl" data-testid="product-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Title</Label>
                <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5 h-11 rounded-xl" data-testid="product-title-input" />
              </div>
              <div>
                <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 rounded-xl min-h-24" data-testid="product-description-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Price (USD)</Label>
                  <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1.5 h-11 rounded-xl" data-testid="product-price-input" disabled={form.type === "lead_magnet"} />
                </div>
                <div>
                  <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Category</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1.5 h-11 rounded-xl" data-testid="product-category-input" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Cover image URL</Label>
                <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="mt-1.5 h-11 rounded-xl" placeholder="https://..." data-testid="product-image-input" />
              </div>
              <div>
                <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Delivery file URL (digital only)</Label>
                <Input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} className="mt-1.5 h-11 rounded-xl" placeholder="https://..." data-testid="product-file-input" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Featured</Label>
                <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} data-testid="product-featured-switch" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Active (visible in store)</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} data-testid="product-active-switch" />
              </div>
              <Button type="submit" disabled={saving} className="w-full rounded-full bg-[#003CFF] hover:bg-[#002ED6] h-11" data-testid="product-save-button">
                {saving ? "Saving…" : "Save product"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-12 text-center text-zinc-500" data-testid="empty-products">
          <Plus className="w-8 h-8 mx-auto text-zinc-300" />
          <p className="mt-3">No products yet. Add your first to start selling.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(p => (
            <div key={p.id} className="rounded-2xl bg-white border border-zinc-100 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]" data-testid={`product-card-${p.id}`}>
              <div className="aspect-video bg-zinc-100 overflow-hidden">
                {p.image_url ? <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm">No image</div>}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold tracking-wider uppercase text-zinc-500">{TYPES.find(t => t.value === p.type)?.label}</div>
                    <div className="font-heading font-semibold text-zinc-900 truncate">{p.title}</div>
                  </div>
                  <div className="text-[#003CFF] font-semibold">${Number(p.price).toFixed(2)}</div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-1">
                  <div className="text-xs text-zinc-500">{p.sales_count || 0} sold · {p.view_count || 0} views</div>
                  <div className="flex gap-1">
                    <Link to={`/product/${p.id}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-zinc-100" data-testid={`product-open-${p.id}`}>
                      <ExternalLink className="w-4 h-4 text-zinc-600" />
                    </Link>
                    <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-zinc-100" data-testid={`product-edit-${p.id}`}>
                      <Pencil className="w-4 h-4 text-zinc-600" />
                    </button>
                    <button onClick={() => onDelete(p.id)} className="p-2 rounded-lg hover:bg-zinc-100" data-testid={`product-delete-${p.id}`}>
                      <Trash2 className="w-4 h-4 text-rose-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
