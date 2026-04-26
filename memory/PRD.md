# PRD — stand. (Creator Board)

## Concept
Creator-first link-in-bio "Board" at `/board/:username`. Each item is Sell or Idea (Waitlist/Support).

## Stack
- FastAPI + MongoDB + React (CRA) + Tailwind + Shadcn + Recharts
- JWT auth (bcrypt) + httpOnly cookie + Bearer
- Stripe via `emergentintegrations` (test key `sk_test_emergent`)
- Resend for email — **MOCKED** (placeholder key — needs real key for live emails)
- Claude Sonnet 4.5 via `emergentintegrations` LlmChat
- Object storage via Emergent Object Storage (`EMERGENT_LLM_KEY`)

## Implemented timeline

**Phase 1** (2026-02-26): Auth, public storefront, product detail, Stripe checkout + webhook, full creator dashboard (overview, products, orders, customers, analytics, affiliates, settings), email capture, idempotent post-payment.

**Phase 2** — Board pivot + AI Quick Idea: `/board/:username` + `/item/:id` aliases, AI quick-create (Claude Sonnet 4.5 → title/one_liner/cta_text → preview/edit/publish), Item card with bold title + one-liner + expand + CTA, Lead Capture modal, telemetry (events collection + aggregate counters, 30-day TTL), auto-ranking on board, Growth Loop floater.

**Phase 3** — Live readiness:
- Image **uploads** (drag/click) wired to Emergent Object Storage; replaces URL-paste in Items create form and Settings avatar; `/api/upload` (auth) + `/api/files/{path}` (public serve, immutable cache).
- $10/month **Pro upgrade** Stripe checkout (`/api/upgrade/checkout`); idempotent post-pay extends `pro_until` by 30 days.
- "Upgrade to Pro" badge in dashboard sidebar (shows ✨ Pro Active when subscribed).
- "Build your store · $10/mo" pricing block on landing page.
- **Removed** Made-with-Emergent badge; updated `<title>` and meta description; preserved necessary platform scripts.
- Account/Pro state refresh after successful upgrade (AuthContext.refreshUser).

## Tests
- 52/52 backend tests pass (auth, store, products, subscribe/customers, orders, affiliates, analytics, checkout + status graceful-degrade, webhook, upload, file serve, upgrade, AI improve, track).

## Backlog
- P0: real Resend key for live emails
- P1: server-side allowlist for `origin_url` on Stripe checkout endpoints
- P1: stream-validate upload size from Content-Length before reading
- P2: ingress cache header passthrough for `/api/files/*`
- P2: trial+reminder system, recurring (true) subscription billing, theme presets, password reset
