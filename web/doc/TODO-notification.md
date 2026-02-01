# Notification System To-Do List

This document tracks the remaining tasks for the implementation of the notification system based on current implementation and technical requirements.

## 🔴 High Priority (Critical Path)

### 1. User-Facing Features

- [ ] **Notification Center**: Create `/account/notifications` page for users to view and manage their on-site notifications.
- [ ] **Notification Preferences**: Create `/account/notifications/preferences` page for users to opt-in/out of specific channels (LINE, Email, etc.) and notification types.
- [ ] **Real-Time Updates**: Implement WebSocket or SSE (Server-Sent Events) to push notifications to the user's browser immediately.

### 2. Core Infrastructure

- [ ] **Plugin Registry**: Formally implement the plugin registry to manage the status (enabled/disabled) of external channel adapters (LINE, WhatsApp, SMS).
- [ ] **Delivery Callbacks**: Implement webhook endpoints to receive delivery status updates from external providers (e.g., SendGrid, LINE, Twilio).
- [ ] **Credential Encryption**: Add encryption/decryption for sensitive channel credentials (API keys, tokens) stored in the database.

## 🟡 Medium Priority (Enhancements)

### 1. RSVP Reminder System

- [x] **Retry Logic**: Implement automatic retries for failed reminders with a backoff strategy.
- [x] **Multiple Reminders**: Update schema and logic to support multiple reminder schedules (e.g., 24 hours before AND 1 hour before).
- [ ] **Admin Monitoring**: Create a dedicated UI to monitor the status of scheduled reminders.

### 2. Admin UI Improvements

- [ ] **Template Preview**: Add a "Preview" feature to the template editor to see how variables will look in the final message.
- [ ] **Mail Queue Filters**: Add advanced filtering (by store, by priority, by status) to the system admin mail queue view.
- [ ] **Dashboard Metrics**: Implement charts showing notification volume and success rates across different channels.

### 3. Reliability & Performance

- [x] **Preference Caching**: Implement caching for user notification preferences to avoid heavy database lookups during high-volume sends.
  - 📋 **Design Document**: [DESIGN-PREFERENCE-CACHING-AND-RATE-LIMITING.md](./NOTIFICATION/DESIGN-PREFERENCE-CACHING-AND-RATE-LIMITING.md#1-preference-caching)
  - **Implementation Plan**: 4 phases, ~4 weeks
  - **Expected Impact**: 20-100x performance improvement, 95%+ cache hit rate
- [x] **Rate Limiting**: Implement per-channel rate limiting to comply with external API providers (e.g., Telegram, WhatsApp).
  - 📋 **Design Document**: [DESIGN-PREFERENCE-CACHING-AND-RATE-LIMITING.md](./NOTIFICATION/DESIGN-PREFERENCE-CACHING-AND-RATE-LIMITING.md#2-rate-limiting)
  - **Implementation Plan**: 4 phases, ~4 weeks
  - **Expected Impact**: Zero API rate limit violations, <1ms overhead

## 🟢 Low Priority (Quality & Maintenance)

### 1. Documentation & QA

- [ ] **Integration Tests**: Create end-to-end tests for the entire notification lifecycle (Queue -> Route -> Send -> Track).
- [ ] **API Docs**: Document the internal notification API for other modules to use easily.
- [x] **Localizations**: Verify and add translation keys for Japanese (jp) and ensure consistency in English (en) and Traditional Chinese (tw).
  - ✅ LINE Flex message keys (`line_flex_*`) added for en, tw, jp (2026-01-28)
  - ✅ Email action button uses localized `view_details` key (2026-01-28)

---

## Recent Progress Summary (✅ Completed)

- **Authentication**: Cron job authentication fixed using `CRON_SECRET` in `.bashrc`.
- **Serialization**: BigInt serialization errors in API responses resolved.
- **Cleanup Logic**: RSVP cleanup now strictly enforces the 5-minute business rule to free time slots.
- **Queue Management**:
  - "Delete Selected" and "Delete All" functionality wired to database for both Message and Mail Queues.
  - Manual "Sync All Status" button added to SysAdmin UI.
- **UI/UX**:
  - Mobile-optimized user selection combobox.
  - User search by Name, Phone, and Email enabled.
- **Infrastructure**: 10-second high-frequency sendmail cron schedule implemented via sleep offsets.
- **LINE Channel Enhancements** (2026-01-28):
  - LINE Flex Message reservation card with i18n support (labels: reservation name, date, time, party size, facility).
  - Added translation keys (`line_flex_*`) for en, tw, jp locales.
  - `buildLineMessages()` logic documented and aligned with JSDoc.
- **Email Channel Enhancements** (2026-01-28):
  - Action button added to HTML emails when `notification.actionUrl` is present.
  - i18n support for button label using recipient's locale (`view_details` key).
  - Relative paths auto-converted to absolute HTTPS URLs.
