# PRD — stand. (Creator Storefront)

## Original problem statement
Build a simple, fast, creator-first link-in-bio storefront app (better than Stan Store). Mobile-first web app where creators can sell digital products, coaching calls, courses, memberships. Setup in under 10 minutes. Stripe checkout. Real analytics. Affiliate system. Email capture.

## Stack
- Backend: FastAPI + MongoDB (via motor)
- Frontend: React (CRA) + Tailwind + Shadcn UI + Recharts
- Auth: JWT (bcrypt) + httpOnly cookie + Bearer fallback
- Payments: Stripe Checkout via `emergentintegrations` (test key)
- Email: Resend (placeholder key — currently mock-logged)

## Implemented (2026-02-26)
- Auth: signup / login / me / logout / delete-account
- Public storefront `/store/:username` (profile, featured, products, email capture, FAQ, testimonials)
- Product detail `/product/:id` with affiliate `?ref=` tracking + discount code + buy / free download
- Stripe checkout: create-session + status polling + webhook + idempotent post-payment processing
- Creator dashboard (sidebar): Overview KPIs, Products CRUD, Orders, Customers (subscribers + buyers + manual add + CSV export), Analytics (KPIs + 14-day trend area chart + top products), Affiliates (create link + copy + clicks/conversions/earnings), Settings (profile + accent color + delete account)
- Email capture (lead magnet flow + storefront subscribe)
- Order email confirmation HTML (Resend; mock-logs without real key)
- Account deletion (full data wipe)

## Personas
- Creator: signs up, configures store, creates products, shares link, watches sales/analytics
- Buyer: visits storefront, picks product, pays via Stripe, receives email + download
- Affiliate: shares `/product/:id?ref=CODE`, earns commission on conversions

## P0 / P1 backlog
- P0: Replace Resend placeholder with real key for live emails
- P1: File uploads (digital delivery file URL is currently a paste field) — wire to object storage
- P1: Subscription/recurring products (currently single one-time charge per session)
- P1: Live FAQ/testimonials editor in Settings (data model exists, UI yet to build)
- P2: Theme presets, custom domain, analytics traffic sources, password reset flow
