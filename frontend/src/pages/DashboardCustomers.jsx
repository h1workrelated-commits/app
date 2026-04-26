import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Download } from "lucide-react";
import { toast } from "sonner";

export default function DashboardCustomers() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "" });

  const load = async () => {
    try { const { data } = await api.get("/customers"); setList(data); } catch {}
  };
  useEffect(() => { load(); }, []);

  const onAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post("/customers", form);
      toast.success("Customer added");
      setOpen(false); setForm({ email: "", name: "" });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const exportCsv = () => {
    const header = "email,name,subscribed,orders,spent\n";
    const rows = list.map(c => `${c.email},${c.name || ""},${c.subscribed},${c.orders},${c.spent}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "customers.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" data-testid="dashboard-customers">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-900">Customers</h1>
          <p className="text-zinc-500 mt-1">Subscribers and buyers, unified.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} className="rounded-full" data-testid="customers-export-csv">
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-[#003CFF] hover:bg-[#002ED6]" data-testid="open-add-customer">
                <Plus className="w-4 h-4 mr-1" /> Add manually
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle className="font-heading">Add a customer</DialogTitle></DialogHeader>
              <form onSubmit={onAdd} className="space-y-4 mt-2">
                <div>
                  <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Email</Label>
                  <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 h-11 rounded-xl" data-testid="customer-email-input" />
                </div>
                <div>
                  <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 h-11 rounded-xl" data-testid="customer-name-input" />
                </div>
                <Button type="submit" className="w-full rounded-full bg-[#003CFF] hover:bg-[#002ED6] h-11" data-testid="customer-save-button">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 p-12 text-center text-zinc-500" data-testid="empty-customers">No customers yet.</div>
      ) : (
        <div className="rounded-2xl bg-white border border-zinc-100 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="grid grid-cols-4 px-5 py-3 text-xs font-semibold tracking-wider uppercase text-zinc-500 border-b border-zinc-100 bg-zinc-50">
            <div>Email</div><div>Name</div><div>Orders</div><div className="text-right">Spent</div>
          </div>
          {list.map(c => (
            <div key={c.email} className="grid grid-cols-4 px-5 py-4 text-sm border-b border-zinc-50 last:border-0" data-testid={`customer-row-${c.email}`}>
              <div className="text-zinc-900 truncate">{c.email}</div>
              <div className="text-zinc-700 truncate">{c.name || "—"}</div>
              <div className="text-zinc-700">{c.orders}</div>
              <div className="text-right font-semibold text-zinc-900">${Number(c.spent).toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
