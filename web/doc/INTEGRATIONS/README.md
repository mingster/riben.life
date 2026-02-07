# Third-Party Integrations

This directory contains documentation for third-party service integrations used in the application.

## Structure

Each integration has its own subdirectory with relevant documentation:

- **[LINE](./LINE/)** - LINE Messaging API and LINE Login integration
  - LINE Messaging API overview
  - LINE Notification integration
  - LINE Send by Phone Number research

- **[GOOGLE-CALENDAR](./GOOGLE-CALENDAR/)** - Google Calendar sync for RSVP
  - Design: RSVP ↔ Google Calendar sync (store calendar and customer “Add to calendar”)

## Adding New Integrations

When adding a new third-party integration:

1. Create a new subdirectory: `doc/INTEGRATIONS/[SERVICE_NAME]/`
2. Add integration-specific documentation
3. Update this README with a link to the new integration

## Integration Categories

### Messaging & Communication

- **LINE** - LINE Messaging API for push notifications and LINE Login

### Calendar & Scheduling

- **Google Calendar** - Sync RSVP reservations to Google Calendar (store and optional customer)

### Payment Processing

- See `doc/PAYMENT/` for payment gateway integrations

### Authentication

- See `doc/FOUNDATION/` for authentication provider integrations
