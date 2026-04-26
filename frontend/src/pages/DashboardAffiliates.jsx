import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

export default function DashboardAffiliates() {
  const [list, setList] = useState([]);
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ product_id: "", commission_pct: 20 });

  const load = async () => {
    try {
      const [a, p] = await Promise.all([api.get("/affiliates"), api.get("/products")]);
      setList(a.data); setProducts(p.data);
    } catch (e) { toast.error(formatApiError(e)); }
  };
  useEffect(() => { load(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post("/affiliates", { product_id: form.product_id, commission_pct: parseFloat(form.commission_pct) });
      toast.success("Affiliate link created");
      setOpen(false); setForm({ product_id: "", commission_pct: 20 });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const linkFor = (a) => `${window.location.origin}/product/${a.product_id}?ref=${a.code}`;

  return (
    <div className="space-y-6" data-testid="dashboard-affiliates">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-900">Affiliates</h1>
          <p className="text-zinc-500 mt-1">Generate trackable links and pay commission on conversions.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-[#003CFF] hover:bg-[#002ED6]" data-testid="open-create-affiliate"><Plus className="w-4 h-4 mr-1" /> New link</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle className="font-heading">New affiliate link</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-4 mt-2">
              <div>
                <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Product</Label>
                <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                  <SelectTrigger className="mt-1.5 h-11 rounded-xl" data-testid="affiliate-product-select"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Commission %</Label>
                <Input type="number" min="0" max="100" step="1" value={form.commission_pct} onChange={(e) => setForm({ ...form, commission_pct: e.target.value })} className="mt-1.5 h-11 rounded-xl" data-testid="affiliate-commission-input" />
              </div>
              <Button disabled={!form.product_id} type="submit" className="w-full rounded-full bg-[#003CFF] hover:bg-[#002ED6] h-11" data-testid="affiliate-save-button">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-12 text-center text-zinc-500" data-testid="empty-affiliates">
          <Share2 className="w-8 h-8 mx-auto text-zinc-300" />
          <p className="mt-3">No affiliate links yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {list.map(a => (
            <div key={a.id} className="rounded-2xl bg-white border border-zinc-100 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]" data-testid={`affiliate-row-${a.id}`}>
              <div className="text-xs font-semibold tracking-wider uppercase text-zinc-500">{a.commission_pct}% commission</div>
              <div className="font-heading font-semibold text-zinc-900 mt-1">{a.product_title}</div>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 text-xs bg-zinc-50 border border-zinc-100 rounded-lg px-2 py-2 truncate">{linkFor(a)}</code>
                <button onClick={() => { navigator.clipboard.writeText(linkFor(a)); toast.success("Copied"); }} className="p-2 rounded-lg hover:bg-zinc-100" data-testid={`affiliate-copy-${a.id}`}>
                  <Copy className="w-4 h-4 text-zinc-600" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div><div className="text-xs text-zinc-500">Clicks</div><div className="font-semibold text-zinc-900">{a.clicks}</div></div>
                <div><div className="text-xs text-zinc-500">Conv.</div><div className="font-semibold text-zinc-900">{a.conversions}</div></div>
                <div><div className="text-xs text-zinc-500">Earned</div><div className="font-semibold text-[#003CFF]">${Number(a.earnings).toFixed(2)}</div></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
