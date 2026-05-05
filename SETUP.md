# Setup Guide

## Environment variables

### Admin auth

```env
ADMIN_USERNAME="admin"
ADMIN_PASSWORD_HASH="scrypt$replace-with-salt$replace-with-hash"
AUTH_SESSION_SECRET="replace-with-a-random-secret"
```

- `ADMIN_USERNAME` is the login username.
- `ADMIN_PASSWORD_HASH` is the stored password hash.
- `AUTH_SESSION_SECRET` signs the admin session cookie.

The app no longer uses plain-text `ADMIN_PASSWORD`.

### Supabase

```env
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used by the app.
- `SUPABASE_SERVICE_ROLE_KEY` is required for the server-side route handlers.

### Email

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM_EMAIL="your-email@gmail.com"
APP_URL="http://localhost:3000"
PROPOSAL_PAYMENT_LINK="https://www.paypal.com/paypalme/atozadvert"
```

Email is optional for development, but required for real proposal delivery.
If `PROPOSAL_PAYMENT_LINK` is omitted, the app falls back to `https://www.paypal.com/paypalme/atozadvert`.

## Password hash generation

The current hash format is:

```text
scrypt$<salt>$<hash>
```

If you want to rotate the password, generate a new `scrypt` hash using the same format and replace `ADMIN_PASSWORD_HASH` in your environment.

## Local startup

```bash
npm install
npm run dev
```

After changing env values, restart the dev server.

## Database setup

Apply every migration file in `supabase/migrations` to the target database, in timestamp order. The current schema depends on all of them, including:

- `20260421000002_add_proposal_pdf_and_response_columns.sql`
- `20260424000007_add_company_branding_fields.sql`

See [SUPABASE_MIGRATIONS.md](/d:/Development%20and%20Plugin%20Projects/Proposal/SUPABASE_MIGRATIONS.md) for the full list.
