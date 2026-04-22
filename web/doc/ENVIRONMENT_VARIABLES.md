# Environment Variables for riben.life

This document lists all environment variables used in the riben.life project.

## Database (Prisma)

```bash
# PostgreSQL connection string (required for the app and for Prisma CLI)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

Put `DATABASE_URL` in **`web/.env.local`** (or `web/.env`) in the `web/` directory. **`prisma.config.ts`** loads **`.env` first, then `.env.local`** (local overrides), so `bun run build` / `bunx prisma generate` pick up the same values Next.js uses locally. If `DATABASE_URL` is only in `.env.local`, that is fine after this setup; previously Prisma’s default loader only read `.env`.

## Google Analytics

```bash
# Google Analytics 4 Measurement ID (for web app)
# Get this from your GA4 property
# Format: G-XXXXXXXXXX
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Google Analytics 4 Measurement ID (for server-side analytics - Roku)
# Get this from your GA4 property
# Format: G-XXXXXXXXXX
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Google Analytics 4 API Secret (for server-side analytics - Roku)
# Create this in your GA4 property under Data Streams > Measurement Protocol API secrets
GTM_API_SECRET=your_api_secret_here
```

## Google Calendar (RSVP staff sync + OAuth)

Used for **per-user** Google Calendar connections (`StoreUserGoogleCalendarConnection`: `storeId` + `userId`). Staff or owner connects in Store Admin; RSVPs sync to the calendar of the **assigned service staff**, or the **store owner** if no staff is assigned.

```bash
# OAuth client (Google Cloud Console → APIs & Services → Credentials)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# Encrypt refresh/access tokens at rest (prefer a dedicated secret in production)
# Falls back to BETTER_AUTH_SECRET if unset (must be strong enough)
GOOGLE_CALENDAR_TOKEN_SECRET=your_long_random_secret

# HMAC for OAuth state cookie (storeId + userId binding)
# Falls back to BETTER_AUTH_SECRET if unset
GOOGLE_OAUTH_STATE_SECRET=your_long_random_secret

# Public site URL for OAuth redirect and links (must match authorized redirect URIs)
# Example dev: http://localhost:3001
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

**Authorized redirect URI** (Google Cloud Console):

- `{NEXT_PUBLIC_BASE_URL}/api/auth/google-calendar`
- Use a single static callback URI (store/user context is carried in signed OAuth `state`).

**Scopes** (must match `web/src/lib/google-calendar/google-oauth-client.ts`; use **full** URLs on the OAuth consent screen):

- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/calendar.readonly`

**Step-by-step GCP setup:** [doc/INTEGRATIONS/GOOGLE-CALENDAR/SETUP-GOOGLE-CALENDAR-OAUTH.md](./INTEGRATIONS/GOOGLE-CALENDAR/SETUP-GOOGLE-CALENDAR-OAUTH.md)

## LINE LIFF (customer-facing)

Used when the app serves **LINE LIFF** pages under `src/app/(root)/liff` (see [LIFF phased roadmap](./INTEGRATIONS/LINE/LIFF-PHASED-ROADMAP.md)). Set the LIFF ID from **LINE Developers** → your LIFF app; it must match the **Endpoint URL** host/path you configure there (typically `{NEXT_PUBLIC_BASE_URL}/liff/...`).

```bash
# LIFF app ID from LINE Developers (exposed to the browser for liff.init)
NEXT_PUBLIC_LIFF_ID=your-liff-id
```

If you use **multiple LIFF apps** (per store or per environment), document the mapping in deployment config; the codebase may need a single ID per build or a small resolver—see the roadmap.

## Next.js Server Actions (self-hosted / PM2)

When self-hosting (e.g. PM2), you may see:

```text
Error: Failed to find Server Action "x". This request might be from an older or newer deployment.
```

Next.js generates new Server Action IDs on each build. After a deploy, cached client JS can still send old action IDs, so the server rejects them. Setting a **persistent encryption key** makes action IDs stable across builds and instances.

```bash
# Persistent key for Server Action encryption (required for self-hosted / multi-instance).
# Generate once and reuse; do not change between deploys.
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=your_base64_encoded_32_byte_key
```

**Generate a key (run once, store in production .env):**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add the output to your production `.env`. Use the **same** value on every deploy and on every server instance (e.g. all PM2 workers). Do not set this in local dev unless you need to test the same behavior.

## PayPal (shop checkout)

Platform fallback when a store has no `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` (or for non‑Pro resolution, matching LINE Pay behavior). Use **sandbox** credentials and `PAYPAL_USE_SANDBOX=true` for testing.

```bash
# REST app credentials (PayPal Developer Dashboard → Apps & credentials)
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret

# Use sandbox API host (api-m.sandbox.paypal.com) when true; omit or false for production
PAYPAL_USE_SANDBOX=true
```

## Cron Jobs

```bash
# Secret token for authenticating cron job requests
# Used by system cron to call API endpoints securely
# Generate a strong random string (e.g., using openssl rand -hex 32)
CRON_SECRET=your_secure_random_string_here
```

## Notification System

```bash
# Notification preference cache TTL (minutes)
# How long to cache user notification preferences in memory
# Default: 5 minutes
# Higher values = better performance but potentially stale data
# Lower values = fresher data but more database queries
NOTIFICATION_PREF_CACHE_TTL=5
```

## Email (SMTP)

```bash
# SMTP server hostname
# Example: smtp.gmail.com, smtp.mailgun.org, mail.example.com
EMAIL_SERVER_HOST=smtp.example.com

# SMTP server port
# Common ports: 587 (TLS), 465 (SSL), 25 (unencrypted)
EMAIL_SERVER_PORT=587

# SMTP authentication username
# Usually your email address or SMTP username
EMAIL_SERVER_USER=your_email@example.com

# SMTP authentication password
# Your email password or SMTP app password
EMAIL_SERVER_PASSWORD=your_password_here

# TLS certificate validation (optional)
# Set to "true" to reject invalid SSL certificates (recommended for production)
# Set to "false" to accept invalid certificates (development only)
# Default: true in production, false in development
# WARNING: Setting to false in production is a security risk
EMAIL_TLS_REJECT_UNAUTHORIZED=true
```

## Product images (Amazon S3)

Store-admin **product images** and **store logos** use **S3 only** (no local `public/` writes). Keys: `products/{productId}/{uuid}.{ext}` and `stores/{storeId}/logo/{uuid}.{ext}`, each with an optional prefix from `PRODUCT_IMAGES_KEY_PREFIX`.

**Step-by-step AWS setup (bucket, IAM, policies, verification):** [doc/dev_op/SETUP-AMAZON-S3.md](./dev_op/SETUP-AMAZON-S3.md)

```bash
# Bucket name (required for uploads)
PRODUCT_IMAGES_BUCKET=your-bucket-name

# Region for the SDK and default public URL host (e.g. ap-northeast-1)
AWS_REGION=ap-northeast-1

# IAM user or instance role credentials (standard AWS SDK env vars)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
# Optional session token for temporary credentials
# AWS_SESSION_TOKEN=...

# Optional: key prefix ending with or without a trailing slash (e.g. "dev/" or "prod")
PRODUCT_IMAGES_KEY_PREFIX=

# Optional: override public URL base (CloudFront, MinIO, or custom endpoint)
# If unset, URLs are virtual-hosted S3: https://{bucket}.s3.{region}.amazonaws.com/{key}
PRODUCT_IMAGES_PUBLIC_BASE_URL=

# Optional: S3-compatible endpoint (MinIO, LocalStack)
# AWS_S3_ENDPOINT=http://127.0.0.1:9000
# Path-style often required for MinIO:
# AWS_S3_FORCE_PATH_STYLE=true
```

**Bucket policy (public read):** allow anonymous `s3:GetObject` on keys you serve in the browser (typically `…/products/*` and `…/stores/*` for logos). The app IAM user/role needs `s3:PutObject` and `s3:DeleteObject` on **both** prefixes; a policy limited to `products/*` alone will break logo uploads.

**Next.js:** `next.config.ts` includes `images.remotePatterns` for `*.s3.*.amazonaws.com` (and related) so `next/image` can optimize remote product URLs.

## Setup Instructions

1. Copy your `.env` file to `.env.local` for local development
2. Add the Google Analytics Measurement ID to your environment variables
3. Restart your development server after adding new environment variables

## Google Analytics Setup

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property or use an existing one
3. Copy the Measurement ID (format: G-XXXXXXXXXX)
4. Add it to your `.env.local` file as shown above

## Testing

To test if Google Analytics is working:

1. Add the GA Measurement ID to your environment variables
2. Start your development server
3. Open your browser's developer tools
4. Check the console for GA-related messages
5. Use Google Analytics Real-time reports to verify events are being tracked

## Production Deployment

Make sure to add the environment variable to your production environment:

- **Vercel**: Add to Project Settings > Environment Variables
- **Other platforms**: Add to your deployment platform's environment variable settings
