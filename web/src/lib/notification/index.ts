/**
 * Notification System
 * Main entry point for the notification system
 */

export * from "./types";
export * from "./notification-service";
export * from "./queue-manager";
export * from "./preference-manager";
export * from "./delivery-tracker";
export * from "./template-engine";
export * from "./realtime-service";
export * from "./channels";

// Export singleton instances
export { notificationService } from "./notification-service";
export { realtimeService } from "./realtime-service";

// Initialize channel adapters (also imported by queue-manager so RSVP flow has adapters)
import "./register-channel-adapters";
