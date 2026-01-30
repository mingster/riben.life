# Environment Variables for riben.life

This document lists all environment variables used in the riben.life project.

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
