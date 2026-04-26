import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap, ShoppingBag, BarChart3, Mail, Users, Check } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="font-heading text-xl font-bold tracking-tight" data-testid="brand-logo">
            stand<span className="text-[#003CFF]">.</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link to="/login" className="text-sm font-medium text-zinc-700 px-3 py-2" data-testid="nav-login">Log in</Link>
            <Link to="/signup" data-testid="nav-signup">
              <Button className="rounded-full bg-[#003CFF] hover:bg-[#002ED6] px-5">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-16">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold tracking-wider uppercase text-zinc-700 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#003CFF]" /> Live in under 10 minutes
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl tracking-tight font-bold text-zinc-900 leading-[1.05]">
              Your link in bio,<br />
              <span className="text-[#003CFF]">but it sells.</span>
            </h1>
            <p className="mt-6 text-lg text-zinc-600 max-w-xl leading-relaxed">
              The fastest way for creators to sell digital products, coaching, courses,
              and memberships. Clean checkout, instant delivery, real analytics. No bloat.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/signup" data-testid="hero-cta-signup">
                <Button className="rounded-full bg-[#003CFF] hover:bg-[#002ED6] h-12 px-7 text-base">
                  Start free <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/store/demo" data-testid="hero-cta-demo">
                <Button variant="outline" className="rounded-full h-12 px-7 text-base border-2">
                  See a demo store
                </Button>
              </Link>
            </div>
            <p className="mt-5 text-sm text-zinc-500">No credit card required · Stripe-powered checkout</p>
          </div>

          <div className="lg:col-span-5">
            <div className="relative rounded-3xl bg-zinc-50 p-6 border border-zinc-100">
              <div className="rounded-2xl bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-3">
                  <img src="https://images.unsplash.com/photo-1754473260215-51f8183c137d?w=160" alt="" className="w-14 h-14 rounded-full object-cover" />
                  <div>
                    <div className="font-heading font-semibold text-zinc-900">@maya</div>
                    <div className="text-sm text-zinc-500">Designer & educator</div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-zinc-700">Tools, templates and 1:1 sessions for ambitious creatives.</p>
                <div className="mt-5 space-y-3">
                  {[{t:"Brand Identity Course", p:"$129"},{t:"1:1 Strategy Call", p:"$220"},{t:"Notion Template Pack", p:"$24"}].map((x) => (
                    <div key={x.t} className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 border border-zinc-100">
                      <div className="text-sm font-medium text-zinc-900">{x.t}</div>
                      <div className="text-sm font-semibold text-[#003CFF]">{x.p}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900 max-w-2xl">
          Everything you need to monetize. Nothing you don't.
        </h2>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {icon: Zap, title:"Setup in 10 minutes", desc:"Sign up, add a product, share your link. That's it."},
            {icon: ShoppingBag, title:"Sell anything", desc:"Digital downloads, coaching, courses, memberships, lead magnets."},
            {icon: BarChart3, title:"Real analytics", desc:"Conversion rate, traffic, revenue trends. Not vanity metrics."},
            {icon: Mail, title:"Email built in", desc:"Capture leads, send confirmations, automate welcomes."},
            {icon: Users, title:"Affiliate program", desc:"One click to generate trackable links with custom commission."},
            {icon: Sparkles, title:"Beautiful by default", desc:"Mobile-first, themeable, fast. No drag-and-drop chaos."},
          ].map((f) => (
            <div key={f.title} className="rounded-2xl bg-white border border-zinc-100 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] lift-on-hover">
              <div className="w-10 h-10 rounded-xl bg-[#003CFF]/10 flex items-center justify-center">
                <f.icon className="w-5 h-5 text-[#003CFF]" />
              </div>
              <h3 className="mt-4 font-heading font-semibold text-lg text-zinc-900">{f.title}</h3>
              <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold tracking-wider uppercase text-zinc-700">
            One simple price
          </div>
          <h2 className="font-heading text-3xl sm:text-5xl font-semibold tracking-tight text-zinc-900 mt-4">
            $10 a month. That's it.
          </h2>
        </div>
        <div className="rounded-3xl bg-white border-2 border-[#003CFF] p-8 sm:p-10 shadow-[0_16px_48px_rgba(0,60,255,0.12)]">
          <div className="flex items-baseline gap-1">
            <span className="font-heading text-6xl font-bold text-zinc-900">$10</span>
            <span className="text-lg text-zinc-500">/month</span>
          </div>
          <p className="text-zinc-600 mt-2">Build your store. Cancel anytime. No commitment.</p>
          <ul className="mt-6 grid sm:grid-cols-2 gap-3">
            {[
              "Unlimited items on your board",
              "AI quick-create ideas in seconds",
              "Built-in email capture",
              "Stripe checkout & instant delivery",
              "Real analytics — no fluff",
              "Auto-ranking for top items",
            ].map(p => (
              <li key={p} className="flex items-start gap-2 text-sm text-zinc-700">
                <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                {p}
              </li>
            ))}
          </ul>
          <Link to="/signup" data-testid="pricing-cta-signup">
            <Button className="mt-7 w-full rounded-full bg-[#003CFF] hover:bg-[#002ED6] h-12 text-base">
              Start your store · $10/mo
            </Button>
          </Link>
          <p className="text-xs text-zinc-400 text-center mt-3">Free trial available · We'll remind you before renewal</p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="rounded-3xl bg-zinc-900 text-white p-10 sm:p-16 text-center">
          <h2 className="font-heading text-3xl sm:text-5xl font-semibold tracking-tight">
            Stop linking. Start selling.
          </h2>
          <p className="mt-4 text-zinc-300 max-w-xl mx-auto">Free to start. Stripe handles payments. You keep what you earn.</p>
          <Link to="/signup" data-testid="footer-cta-signup">
            <Button className="mt-8 rounded-full bg-white text-zinc-900 hover:bg-zinc-200 h-12 px-8 text-base font-semibold">
              Create your store
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-100 py-8 text-center text-sm text-zinc-500">
        Built fast. Made for creators. © stand.
      </footer>
    </div>
  );
}
