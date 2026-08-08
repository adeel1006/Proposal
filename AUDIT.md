# Production Readiness Audit

Repository: `Proposal`

Date of review: 2026-08-08

## Scope Reviewed

- Architecture and major modules
- Frontend/backend boundaries
- Authentication and authorization
- Database access and Supabase usage
- API routes
- Environment and configuration handling
- Third-party integrations
- Tests
- Lint, typecheck, build commands
- Deployment configuration

## System Overview

- The app is a Next.js 16 App Router project.
- Most admin pages under `app/admin/` are client components, while `app/layout.tsx`, `app/admin/layout.tsx`, and route handlers are server-side.
- Data access is centered on Supabase/Postgres via `lib/supabase.ts` and the route handlers under `app/api/*`.
- The app includes custom auth, proposal/invoice PDF generation, email delivery with Nodemailer, AI proposal generation, currency conversion, and Google Sheets export.
- Customer, company, services, draft proposal, and proposal tables are managed by SQL migrations under `supabase/migrations/`.
- Available scripts in `package.json` are `dev`, `build`, `start`, and `lint`.
- No automated test files were found in the repository.
- No `.github` workflow or `.vercel` deployment config was present in the repository tree.

## Findings

### 1. Critical: Supabase policies allow unrestricted public read/write access to the entire dataset

- Exact files and functions:
  - `supabase/migrations/20260421000001_create_proposals_table.sql`
  - `supabase/migrations/20260422000003_create_companies_table.sql`
  - `supabase/migrations/20260422000004_create_company_services_table.sql`
  - `supabase/migrations/20260422000005_create_draft_proposals_table.sql`
  - `supabase/migrations/20260422000006_create_proposal_responses_table.sql`
  - `supabase/migrations/20260506000010_create_customers_and_link_proposals.sql`
- What is wrong:
  - Every table enables RLS, but the policies are `using (true)` and `with check (true)` for select/insert/update/delete.
  - That makes the tables effectively public when accessed with the Supabase anon key.
- Why it matters:
  - Anyone who can use the public Supabase URL and anon key can read, insert, update, or delete production data directly.
  - This bypasses the app’s admin login entirely and exposes companies, customers, drafts, proposals, and proposal responses.
- How to reproduce or verify:
  - Use the public Supabase anon key from the client config or `.env.example`.
  - Connect with `@supabase/supabase-js` or the Supabase REST endpoint and call `select`, `insert`, `update`, or `delete` against `companies`, `customers`, `company_services`, `draft_proposals`, `proposals`, or `proposal_responses`.
- Recommended fix:
  - Replace allow-all policies with role-based policies.
  - Restrict writes to authenticated admin sessions or server-side service-role access only.
  - Remove any reliance on public direct database writes from the client.
- Regression risk:
  - High. This changes the access model for the entire app and may require migrations plus auth-aware API changes.
- Tests that should be added:
  - Integration tests proving anon-key access is denied for protected tables.
  - Server-side tests proving authenticated/admin route handlers still work through the service role.
  - Negative tests for insert/update/delete on each protected table.

### 2. High: Admin authentication is forgeable and the documented environment contract does not match runtime behavior

- Exact files and functions/components:
  - `lib/auth.ts` `isAuthenticated`
  - `app/api/auth/login/route.ts` `POST`
  - `proxy.ts` `proxy`
  - `app/admin/layout.tsx` `AdminLayout`
  - `README.md`, `SETUP.md`, `.env.example`, `QUICKSTART.md`
- What is wrong:
  - The auth cookie is just a static string value (`authenticated`) and both the proxy and admin layout only compare that value.
  - The login route compares plain-text username/password values and falls back to `admin` / `admin123` if env vars are missing.
  - The docs conflict with the implementation: `SETUP.md` and `.env.example` describe a hashed password and session secret, but the runtime code does not use them.
- Why it matters:
  - A client can forge the auth cookie locally and pass the admin gate without a real server-side session.
  - If production env vars are misconfigured or omitted, the app silently falls back to known default credentials.
  - The docs create a false sense of security and make secure deployment easy to misconfigure.
- How to reproduce or verify:
  - Set the cookie `proposal-admin-auth=authenticated` in the browser and load `/admin/proposals` or any protected `/api/*` endpoint.
  - Omit `ADMIN_USERNAME`/`ADMIN_PASSWORD` in the environment and log in with `admin` / `admin123`.
  - Compare `SETUP.md` against `app/api/auth/login/route.ts` and `lib/auth.ts`; the hash/secret described in docs are not used by runtime auth.
- Recommended fix:
  - Replace the static cookie check with a signed, server-verified session token.
  - Remove default credential fallbacks.
  - Align docs and `.env.example` with the real auth implementation.
- Regression risk:
  - High. This changes login, logout, and every auth gate in the app.
- Tests that should be added:
  - Login succeeds only with valid configured credentials.
  - Forged cookies are rejected by both page routing and API requests.
  - Logout invalidates the session.
  - Documentation validation test or checklist to keep env docs in sync with runtime auth.

### 3. Medium: Public accept/decline endpoints mutate proposal state with no secret token or ownership proof

- Exact files and functions/components:
  - `app/api/proposals/accept/route.ts` `GET`
  - `app/api/proposals/decline/route.ts` `GET`
  - `lib/emailService.ts` `buildEmailHtml` and `sendProposalEmail`
- What is wrong:
  - The email action links contain only `proposalId` and `email`.
  - The accept/decline routes update proposal status immediately on GET, without validating a signed token, one-time nonce, or any email ownership proof.
  - The `email` query parameter is displayed but not used to authorize the mutation.
- Why it matters:
  - Anyone who obtains or guesses a proposal ID can change its status.
  - Forwarded email links are replayable forever because there is no token expiration or single-use protection.
  - Because these are GET requests, status changes can also be triggered by crawlers or accidental prefetching in some environments.
- How to reproduce or verify:
  - Call `/api/proposals/accept?proposalId=<known-id>` or `/api/proposals/decline?proposalId=<known-id>` directly.
  - The route updates proposal status even if the `email` parameter is omitted or incorrect.
- Recommended fix:
  - Change the action links to include a signed, expiring, one-time token.
  - Require POST for the status-changing action.
  - Validate the token against the proposal and client email before updating the database.
- Regression risk:
  - Medium. The email templates, client flows, and proposal response handling will need coordinated updates.
- Tests that should be added:
  - Valid token updates the proposal status.
  - Missing/invalid/replayed token is rejected.
  - GET requests without a valid token do not mutate the database.

## Validation Notes

- Repository scripts: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`.
- No unit/integration/e2e test files were present.
- `npm run lint` was available and reports existing non-blocking warnings.
- `npm run build` compiled but failed in this environment while writing `.next/cache/.tsbuildinfo` with `EPERM`; that appears environment-specific rather than a code defect.

## Overall Assessment

The app has a clear Next.js + Supabase architecture and a functional admin workflow, but it is not production-ready as-is because the access model is fundamentally too open. The highest-priority work is to fix database authorization and replace the current cookie-based admin auth with a signed server-verified session before treating the site as deployable.
