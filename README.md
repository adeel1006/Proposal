# Proposal Maker

Proposal Maker is a Next.js 16 admin tool for creating, sending, and tracking professional business proposals. It supports company branding, customer CRM, AI-assisted proposal generation, PDF export, and email delivery — all backed by Supabase.

## What it does

- Secure admin login with plain-text password comparison and `httpOnly` session cookies (7-day TTL)
- Company branding management: logo, currency, website, registration number, reply-to email, and social links (Instagram, LinkedIn, Twitter, Facebook, YouTube, Pinterest)
- Company-specific service catalogs with name, description, price, currency, category, and quantity
- Customer CRM: name, email, phone, business website, required service, notes, and full proposal history
- Proposal drafting with 3-tab editor (General Info, Services, Preview), live preview, and 2-second auto-save to Supabase
- AI proposal generation via OpenAI (Responses API), Google Gemini, or Mistral — with website scraping, SEO keyword extraction, focus inference, and local fallback on provider failure
- Client-side PDF generation using `html2pdf.js` (CDN) with base64 storage in Supabase
- Responsive proposal email via Nodemailer with embedded company logo (CID), services table with USD conversion, Accept/Pay and Decline action buttons, and PDF attachment
- Submitted proposal tracking with inline status dropdown, detail modal, resend flow, and delete
- Client-facing accept/decline flows that update proposal status via `GET` redirect routes
- Google Sheets export endpoint (`/api/export-to-sheets`) for proposal data
- Live currency conversion via `exchangerate-api.com` with 24-hour cache and 28-currency static fallback

## Project docs

- [QUICKSTART.md](./QUICKSTART.md)
- [SETUP.md](./SETUP.md)
- [SUPABASE_MIGRATIONS.md](./SUPABASE_MIGRATIONS.md)

## Main routes

| Route | Description |
|---|---|
| `/` | Landing page with feature cards |
| `/login` | Admin login form |
| `/admin/proposals` | Proposal editor (3-tab: General Info, Services, Preview) |
| `/admin/ai-proposal` | AI proposal generator |
| `/admin/companies` | Company branding CRUD |
| `/admin/services` | Service catalog CRUD per company |
| `/admin/customers` | Customer CRM with proposal history |
| `/admin/submitted-proposals` | Submitted proposals table with status management |

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.3 (App Router, `force-dynamic`) |
| Language | TypeScript 5 |
| Database | Supabase (PostgreSQL via `@supabase/supabase-js` v2) |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| PDF | `html2pdf.js` 0.10.1 (CDN, client-side) |
| Email | Nodemailer v8 + Gmail SMTP |
| AI | OpenAI Responses API, Google Gemini, Mistral |
| Currency | `exchangerate-api.com` (live) + 28-currency static fallback |
| Auth | Plain-text password env var, `httpOnly` signed session cookie |
| Path alias | `@/` → project root |

## Key architecture notes

- All `/app/api/` route handlers are **server-side** and use `getSupabaseAdminClient()` per request
- All `/app/admin/` pages are **`'use client'`** components
- `app/layout.tsx` and `app/admin/layout.tsx` are **server components** that handle auth checks and redirects
- `lib/hooks/` provides `useCompanies`, `useCustomers`, `useServices`, and `useDraftProposals` with module-level caching
- DB columns are `snake_case`; all API responses transform to `camelCase` for the frontend
- `/api/proposals` GET and POST include graceful fallbacks for older DB schemas missing `response_at`, `customer_id`, `payment_link`, or `attachments` columns
