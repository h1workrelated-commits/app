# PRD — stand. (Creator Board)

## Concept
Each creator has a **Board** at `/board/:username`. Board contains **Items** (Sell or Idea). Idea items have a CTA: Waitlist (email capture) or Support (paid).

## Stack
- Backend: FastAPI + MongoDB (motor)
- Frontend: React (CRA) + Tailwind + Shadcn + Recharts
- Auth: JWT (bcrypt) + httpOnly cookie + Bearer fallback
- Payments: Stripe Checkout via `emergentintegrations` (test key)
- Email: Resend (placeholder key — emails are mock-logged unless real key set)
- AI: Claude Sonnet 4.5 via `emergentintegrations` LlmChat (Emergent universal key)

## Implemented
**Phase 1 (2026-02-26)**
- Auth (signup/login/me/logout/delete-account)
- Public storefront, product detail, Stripe checkout (create-session + status polling + webhook), creator dashboard (overview, products, orders, customers, analytics, affiliates, settings), email capture, idempotent post-payment processing

**Phase 2 (2026-02-26) — Board pivot + AI Quick Idea**
- Routes: `/board/:username` and `/item/:id` aliases (old `/store/`, `/product/` still work)
- AI Quick Idea: floating ⚡ button on Items page → free-text input → Claude Sonnet 4.5 cleans into `{title, one_liner, cta_text}` → preview/edit → publish (defaults to Idea + Waitlist + free)
- Item card: bold title, one-liner, expand for full description, CTA button (Join waitlist / Support / Buy)
- Lead Capture modal: email-only, low-friction
- Telemetry: per-item events (view/click/cta_click/email_submit/time_spent) + aggregate counters; events collection auto-expires after 30 days
- Auto-ranking on board: `score = clicks*1 + email_conversions*3 + time_factor`; featured items pinned first, then by score
- Growth Loop: bottom-right "Start your own board" button on board pages, appears after 4s, dismissible (session-scoped), modal → /signup
- Item form simplified: Sell ↔ Idea toggle; Idea has Waitlist/Support sub-toggle
- Removed Affiliates from sidebar (backend kept for compatibility)

## Personas
- Creator: signs up → AI-publishes ideas in seconds → shares board link → watches what's converting
- Visitor: lands on board → reads item → joins waitlist (email) or buys
- Affiliate (legacy): tracked links + commission

## Backlog
- P0: real Resend key for live emails
- P1: object-storage for digital file uploads
- P1: subscription/recurring billing for memberships
- P2: AI suggestions on existing items (improve title/price), trial system + reminder emails, theme presets, password reset, traffic-source breakdown
