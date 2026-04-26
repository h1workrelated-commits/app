import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function DashboardSettings() {
  const { user, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { (async () => {
    try { const { data } = await api.get("/store"); setStore(data); } catch (e) { toast.error(formatApiError(e)); }
  })(); }, []);

  const update = (k, v) => setStore({ ...store, [k]: v });

  const onSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put("/store", {
        name: store.name, bio: store.bio, avatar_url: store.avatar_url, accent_color: store.accent_color,
      });
      toast.success("Saved");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const onDelete = async () => {
    try { await deleteAccount(); toast.success("Account deleted"); navigate("/"); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  if (!store) return <div className="text-zinc-500">Loading…</div>;

  return (
    <div className="space-y-6" data-testid="dashboard-settings">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-900">Settings</h1>
        <p className="text-zinc-500 mt-1">Profile, branding, and account.</p>
      </div>

      <form onSubmit={onSave} className="rounded-2xl bg-white border border-zinc-100 p-6 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
        <h2 className="font-heading text-lg font-semibold text-zinc-900">Profile</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Display name</Label>
            <Input value={store.name || ""} onChange={(e) => update("name", e.target.value)} className="mt-1.5 h-11 rounded-xl" data-testid="settings-name-input" />
          </div>
          <div>
            <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Username</Label>
            <Input value={store.username} disabled className="mt-1.5 h-11 rounded-xl bg-zinc-50" data-testid="settings-username-input" />
          </div>
        </div>
        <div>
          <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Bio</Label>
          <Textarea value={store.bio || ""} onChange={(e) => update("bio", e.target.value)} className="mt-1.5 rounded-xl min-h-24" data-testid="settings-bio-input" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Avatar URL</Label>
            <Input value={store.avatar_url || ""} onChange={(e) => update("avatar_url", e.target.value)} className="mt-1.5 h-11 rounded-xl" placeholder="https://..." data-testid="settings-avatar-input" />
          </div>
          <div>
            <Label className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Accent color</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <input type="color" value={store.accent_color || "#003CFF"} onChange={(e) => update("accent_color", e.target.value)} className="h-11 w-12 rounded-xl border border-zinc-200" data-testid="settings-color-input" />
              <Input value={store.accent_color || "#003CFF"} onChange={(e) => update("accent_color", e.target.value)} className="h-11 rounded-xl" />
            </div>
          </div>
        </div>
        <Button disabled={saving} type="submit" className="rounded-full bg-[#003CFF] hover:bg-[#002ED6]" data-testid="settings-save-button">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <div className="rounded-2xl bg-white border border-rose-100 p-6 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <h2 className="font-heading text-lg font-semibold text-zinc-900">Danger zone</h2>
        <p className="text-sm text-zinc-600 mt-1 mb-4">Permanently delete your account, store, products, orders, and customers.</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="rounded-full border-rose-200 text-rose-600 hover:bg-rose-50" data-testid="delete-account-button">Delete account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-heading">Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>This is permanent. All your data will be removed.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full" data-testid="delete-cancel-button">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="rounded-full bg-rose-600 hover:bg-rose-700" data-testid="delete-confirm-button">Delete forever</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
