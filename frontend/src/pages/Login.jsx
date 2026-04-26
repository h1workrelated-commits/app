import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
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
        <Link to="/" className="font-heading text-2xl font-bold block text-center mb-10" data-testid="brand-logo-login">
          stand<span className="text-[#003CFF]">.</span>
        </Link>
        <div className="rounded-2xl border border-zinc-100 bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-zinc-900">Welcome back</h1>
          <p className="text-sm text-zinc-500 mt-1">Log in to your creator dashboard</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email" className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-11 rounded-xl" data-testid="login-email-input" />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs font-semibold tracking-wider uppercase text-zinc-700">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 h-11 rounded-xl" data-testid="login-password-input" />
            </div>
            <Button disabled={loading} type="submit" className="w-full rounded-full bg-[#003CFF] hover:bg-[#002ED6] h-11" data-testid="login-submit-button">
              {loading ? "Logging in…" : "Log in"}
            </Button>
          </form>
          <p className="mt-6 text-sm text-zinc-600 text-center">
            New here? <Link to="/signup" className="text-[#003CFF] font-medium" data-testid="login-to-signup-link">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
