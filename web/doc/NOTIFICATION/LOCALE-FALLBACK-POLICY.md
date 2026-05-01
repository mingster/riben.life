# Notification Locale Fallback Policy

## Overview

This document defines the runtime locale resolution order for notification template rendering.

## Resolution Order

When rendering a template, the system resolves the localized content in this exact order:

1. Requested locale (user locale or explicit locale input), for example `ja-JP`.
2. Locale variant fallback by language, for example `ja-*` locales when requested locale language is `ja`.
3. Store default locale.
4. Store default locale variant fallback by language.
5. System default locale (`en-US`).
6. If no active localized row is found, rendering fails and the notification is suppressed by caller handling.

## Notes

- Locale normalization maps common shorthand values:
  - `tw` / `zh-tw` -> `zh-TW`
  - `jp` / `ja-jp` -> `ja-JP`
  - `en` / `en-us` -> `en-US`
- Language fallback uses the `Locale` table (`id`, `lng`) to choose available locale variants.
- The fallback chain is deterministic and deduplicated.
