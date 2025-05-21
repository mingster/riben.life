// sentry.client.config.js

import * as Sentry from "@sentry/nextjs";
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration()],
  tracePropagationTargets: [process.env.NEXT_PUBLIC_API_URL || ""],
});