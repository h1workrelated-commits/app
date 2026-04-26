import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(form);
      toast.success("Store created. Let's go!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <div className="w-full max-w-md">
        <Link to="/" className="font-heading text-2xl font-bold block text-center mb-10" data-testid="brand-logo-signup">
          stand<span className="text-[#003CFF]">.</span>
        </Link>
        <div className="rounded-2xl border border-zinc-100 bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-zinc-900">Create your store</h1>
          <p className="text-sm text-zinc-500 mt-1">Live in 10 minutes. Free to start.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="name" className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Display name</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 h-11 rounded-xl" data-testid="signup-name-input" />
            </div>
            <div>
              <Label htmlFor="username" className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Username</Label>
              <div className="mt-1.5 flex items-center rounded-xl border border-zinc-200 px-3 h-11 focus-within:border-[#003CFF] focus-within:ring-1 focus-within:ring-[#003CFF]">
                <span className="text-sm text-zinc-400">/store/</span>
                <input id="username" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} className="flex-1 bg-transparent outline-none text-sm" placeholder="yourname" data-testid="signup-username-input" />
              </div>
            </div>
            <div>
              <Label htmlFor="email" className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 h-11 rounded-xl" data-testid="signup-email-input" />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Password</Label>
              <Input id="password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1.5 h-11 rounded-xl" data-testid="signup-password-input" />
            </div>
            <Button disabled={loading} type="submit" className="w-full rounded-full bg-[#003CFF] hover:bg-[#002ED6] h-11" data-testid="signup-submit-button">
              {loading ? "Creating…" : "Create my store"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-zinc-600 text-center">
            Already have one? <Link to="/login" className="text-[#003CFF] font-medium" data-testid="signup-to-login-link">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
