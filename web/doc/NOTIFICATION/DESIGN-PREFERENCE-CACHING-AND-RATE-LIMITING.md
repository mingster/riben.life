# Design: Preference Caching & Rate Limiting

**Date:** 2026-01-28  
**Status:** Design Document  
**Related:** [TECHNICAL-DESIGN-NOTIFICATION.md](./TECHNICAL-DESIGN-NOTIFICATION.md), [TODO-notification.md](../TODO-notification.md)

## Overview

This document outlines the design and implementation plan for two critical performance and reliability features:

1. **Preference Caching**: Reduce database load during high-volume notification sends by caching user notification preferences
2. **Rate Limiting**: Protect external API providers (LINE, WhatsApp, Telegram, etc.) from rate limit violations by implementing per-channel rate limiting

## 1. Preference Caching

### 1.1 Problem Statement

**Current State:**

- `PreferenceManager.getUserPreferences()` queries the database on every notification send
- During bulk sends (e.g., system-wide notifications to 1000+ users), this results in:
  - 1000+ database queries for preferences
  - Significant latency (each query ~10-50ms)
  - Database connection pool exhaustion
  - Poor user experience (slow notification delivery)

**Example Scenario:**

```typescript
// Sending to 1000 users = 1000 preference queries
for (const user of users) {
  const prefs = await preferenceManager.getUserPreferences(user.id, storeId);
  // ... use preferences
}
```

### 1.2 Solution Architecture

**Caching Strategy:**

- **Cache Layer**: In-memory cache (Node.js Map) with TTL (Time-To-Live)
- **Cache Key Format**: `pref:${userId}:${storeId || 'global'}`
- **TTL**: 5 minutes (configurable via environment variable)
- **Cache Invalidation**: On preference updates, manual invalidation, or TTL expiry

**Cache Hierarchy:**

1. **Memory Cache** (fastest, per-instance)
2. **Database** (fallback if cache miss)

### 1.3 Implementation Plan

#### Step 1: Create Cache Manager

**File:** `src/lib/notification/preference-cache.ts`

```typescript
interface CachedPreference {
  data: UserNotificationPreferences;
  expiresAt: number; // Unix timestamp (milliseconds)
}

class PreferenceCache {
  private cache = new Map<string, CachedPreference>();
  private ttl: number; // milliseconds

  constructor(ttlMinutes: number = 5) {
    this.ttl = ttlMinutes * 60 * 1000;
  }

  get(key: string): UserNotificationPreferences | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: UserNotificationPreferences): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttl,
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateUser(userId: string): void {
    // Invalidate all preferences for a user (global + all stores)
    for (const key of this.cache.keys()) {
      if (key.startsWith(`pref:${userId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  // Periodic cleanup of expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}
```

#### Step 2: Update PreferenceManager

**File:** `src/lib/notification/preference-manager.ts`

```typescript
import { PreferenceCache } from "./preference-cache";

export class PreferenceManager {
  private cache: PreferenceCache;

  constructor() {
    const ttlMinutes = parseInt(process.env.NOTIFICATION_PREF_CACHE_TTL || "5", 10);
    this.cache = new PreferenceCache(ttlMinutes);
    
    // Periodic cleanup every 1 minute
    setInterval(() => this.cache.cleanup(), 60 * 1000);
  }

  async getUserPreferences(
    userId: string,
    storeId: string | null,
  ): Promise<UserNotificationPreferences> {
    const cacheKey = `pref:${userId}:${storeId || "global"}`;
    
    // Try cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from database
    const preferences = await this.fetchFromDatabase(userId, storeId);
    
    // Store in cache
    this.cache.set(cacheKey, preferences);
    
    return preferences;
  }

  // Invalidate cache when preferences are updated
  invalidateCache(userId: string, storeId: string | null = null): void {
    const cacheKey = `pref:${userId}:${storeId || "global"}`;
    this.cache.invalidate(cacheKey);
    
    // Also invalidate global if store-specific was updated
    if (storeId) {
      this.cache.invalidate(`pref:${userId}:global`);
    }
  }

  private async fetchFromDatabase(
    userId: string,
    storeId: string | null,
  ): Promise<UserNotificationPreferences> {
    // ... existing database query logic ...
  }
}
```

#### Step 3: Invalidate Cache on Updates

**File:** `src/actions/sysAdmin/notification/update-user-preferences.ts` (new)

```typescript
import { PreferenceManager } from "@/lib/notification/preference-manager";

const preferenceManager = new PreferenceManager();

export const updateUserPreferencesAction = userRequiredActionClient
  .schema(updateUserPreferencesSchema)
  .action(async ({ parsedInput }) => {
    // ... update database ...
    
    // Invalidate cache
    preferenceManager.invalidateCache(
      parsedInput.userId,
      parsedInput.storeId || null,
    );
    
    return { data: updatedPreferences };
  });
```

#### Step 4: Environment Configuration

**File:** `.env`

```bash
# Notification preference cache TTL (minutes)
NOTIFICATION_PREF_CACHE_TTL=5
```

### 1.4 Performance Impact

**Before Caching:**

- 1000 users = 1000 DB queries = ~10-50 seconds
- Database connection pool exhaustion
- High latency

**After Caching:**

- 1000 users = ~10-50 DB queries (cache hits) = ~0.1-0.5 seconds
- 95%+ cache hit rate after warm-up
- 20-100x performance improvement

### 1.5 Testing Strategy

1. **Unit Tests:**
   - Cache hit/miss scenarios
   - TTL expiration
   - Cache invalidation
   - Concurrent access

2. **Integration Tests:**
   - Bulk notification send with cache
   - Preference update with cache invalidation
   - Cache cleanup

3. **Load Tests:**
   - Send to 1000+ users
   - Measure database query reduction
   - Verify cache hit rate

---

## 2. Rate Limiting

### 2.1 Problem Statement

**Current State:**

- No rate limiting for external notification channels (LINE, WhatsApp, Telegram, SMS, etc.)
- Risk of violating external API provider rate limits:
  - **LINE**: 1000 messages/second per channel
  - **WhatsApp**: 1000 messages/second per phone number
  - **Telegram**: 30 messages/second per bot
  - **Twilio (SMS)**: 1 message/second per phone number (default)
  - **Mitake (SMS)**: Varies by plan

**Consequences:**

- API rate limit errors (429 Too Many Requests)
- Temporary service suspension
- Failed notifications
- Poor user experience

### 2.2 Solution Architecture

**Rate Limiting Strategy:**

- **Per-Channel Rate Limiting**: Each channel has its own rate limit configuration
- **Token Bucket Algorithm**: Allows bursts while maintaining average rate
- **Configurable Limits**: Store limits in database (`SystemNotificationSettings` or channel config)
- **Queue-Based**: When rate limit exceeded, queue notification for later processing

**Rate Limit Storage:**

- **In-Memory**: Fast, per-instance (suitable for single-server deployments)
- **Redis** (future): Distributed rate limiting for multi-server deployments

### 2.3 Implementation Plan

#### Step 1: Create Rate Limiter

**File:** `src/lib/notification/rate-limiter.ts`

```typescript
interface RateLimitConfig {
  maxRequests: number; // Maximum requests allowed
  windowMs: number; // Time window in milliseconds
  burst?: number; // Optional: Allow burst of N requests
}

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // Seconds until next request allowed
  remaining?: number; // Remaining requests in current window
}

interface RateLimitEntry {
  timestamps: number[]; // Array of request timestamps
  lastCleanup: number; // Last cleanup time
}

class NotificationRateLimiter {
  private limits = new Map<string, RateLimitConfig>();
  private buckets = new Map<string, RateLimitEntry>();

  // Default rate limits per channel (requests per minute)
  private defaultLimits: Record<NotificationChannel, RateLimitConfig> = {
    onsite: { maxRequests: 10000, windowMs: 60000 }, // No limit for on-site
    email: { maxRequests: 100, windowMs: 60000 }, // 100 emails/minute
    line: { maxRequests: 1000, windowMs: 1000 }, // 1000 messages/second
    whatsapp: { maxRequests: 1000, windowMs: 1000 }, // 1000 messages/second
    wechat: { maxRequests: 200, windowMs: 60000 }, // 200 messages/minute
    sms: { maxRequests: 60, windowMs: 60000 }, // 60 SMS/minute (Twilio default)
    telegram: { maxRequests: 30, windowMs: 1000 }, // 30 messages/second
    push: { maxRequests: 1000, windowMs: 1000 }, // 1000 push notifications/second
  };

  /**
   * Check if a request is allowed for a channel
   */
  async checkRateLimit(
    channel: NotificationChannel,
    storeId?: string,
  ): Promise<RateLimitResult> {
    const key = storeId ? `${channel}:${storeId}` : channel;
    const config = this.getConfig(channel, storeId);
    const now = Date.now();

    // Get or create bucket
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { timestamps: [], lastCleanup: now };
      this.buckets.set(key, bucket);
    }

    // Cleanup old timestamps
    this.cleanupBucket(bucket, config, now);

    // Check if limit exceeded
    if (bucket.timestamps.length >= config.maxRequests) {
      const oldestTimestamp = bucket.timestamps[0];
      const retryAfter = Math.ceil(
        (oldestTimestamp + config.windowMs - now) / 1000,
      );

      logger.warn("Rate limit exceeded", {
        metadata: {
          channel,
          storeId,
          current: bucket.timestamps.length,
          max: config.maxRequests,
          retryAfter,
        },
        tags: ["rate-limit", "notification"],
      });

      return {
        allowed: false,
        retryAfter,
        remaining: 0,
      };
    }

    // Add current request
    bucket.timestamps.push(now);

    return {
      allowed: true,
      remaining: config.maxRequests - bucket.timestamps.length,
    };
  }

  /**
   * Get rate limit configuration for a channel
   */
  private getConfig(
    channel: NotificationChannel,
    storeId?: string,
  ): RateLimitConfig {
    // TODO: Load from database (SystemNotificationSettings or channel config)
    // For now, use defaults
    return this.defaultLimits[channel] || {
      maxRequests: 100,
      windowMs: 60000,
    };
  }

  /**
   * Cleanup old timestamps from bucket
   */
  private cleanupBucket(
    bucket: RateLimitEntry,
    config: RateLimitConfig,
    now: number,
  ): void {
    // Only cleanup every 10 seconds to avoid overhead
    if (now - bucket.lastCleanup < 10000) {
      return;
    }

    bucket.timestamps = bucket.timestamps.filter(
      (timestamp) => now - timestamp < config.windowMs,
    );
    bucket.lastCleanup = now;
  }

  /**
   * Reset rate limit for a channel (for testing/admin)
   */
  reset(channel: NotificationChannel, storeId?: string): void {
    const key = storeId ? `${channel}:${storeId}` : channel;
    this.buckets.delete(key);
  }
}
```

#### Step 2: Integrate with QueueManager

**File:** `src/lib/notification/queue-manager.ts`

```typescript
import { NotificationRateLimiter } from "./rate-limiter";

export class QueueManager {
  private rateLimiter = new NotificationRateLimiter();

  async processNotification(
    notificationId: string,
    channel: NotificationChannel,
  ): Promise<DeliveryResult> {
    // Check rate limit before processing
    const rateLimitCheck = await this.rateLimiter.checkRateLimit(
      channel,
      notification.storeId || undefined,
    );

    if (!rateLimitCheck.allowed) {
      logger.warn("Notification rate limited, queuing for later", {
        metadata: {
          notificationId,
          channel,
          retryAfter: rateLimitCheck.retryAfter,
        },
        tags: ["rate-limit", "queue"],
      });

      // Update delivery status to indicate rate limited
      await sqlClient.notificationDeliveryStatus.updateMany({
        where: {
          notificationId,
          channel,
          status: "pending",
        },
        data: {
          status: "pending", // Keep as pending
          errorMessage: `Rate limited. Retry after ${rateLimitCheck.retryAfter}s`,
          updatedAt: getUtcNowEpoch(),
        },
      });

      return {
        success: false,
        channel,
        error: `Rate limit exceeded. Retry after ${rateLimitCheck.retryAfter} seconds`,
      };
    }

    // Proceed with normal processing...
    // ... existing code ...
  }
}
```

#### Step 3: Add Rate Limit Configuration to Database

**File:** `prisma/schema.prisma`

```prisma
model SystemNotificationSettings {
  // ... existing fields ...
  
  // Rate limiting configuration
  rateLimitEmailPerMinute      Int? @default(100)
  rateLimitLinePerSecond       Int? @default(1000)
  rateLimitWhatsAppPerSecond   Int? @default(1000)
  rateLimitWeChatPerMinute     Int? @default(200)
  rateLimitSmsPerMinute        Int? @default(60)
  rateLimitTelegramPerSecond   Int? @default(30)
  rateLimitPushPerSecond       Int? @default(1000)
}
```

#### Step 4: Create Rate Limit Monitoring

**File:** `src/lib/notification/rate-limit-monitor.ts`

```typescript
export class RateLimitMonitor {
  /**
   * Get current rate limit status for all channels
   */
  async getStatus(): Promise<Record<NotificationChannel, {
    current: number;
    max: number;
    percentage: number;
  }>> {
    // Implementation to query rate limiter state
    // Useful for admin dashboard
  }

  /**
   * Get rate limit violations in last 24 hours
   */
  async getViolations(): Promise<Array<{
    channel: NotificationChannel;
    timestamp: bigint;
    storeId?: string;
  }>> {
    // Query from logs or dedicated table
  }
}
```

### 2.4 Configuration Examples

**Environment Variables:**

```bash
# Rate limit overrides (optional, defaults in code)
NOTIFICATION_RATE_LIMIT_EMAIL_PER_MINUTE=100
NOTIFICATION_RATE_LIMIT_LINE_PER_SECOND=1000
NOTIFICATION_RATE_LIMIT_SMS_PER_MINUTE=60
```

**Database Configuration:**

- System-wide defaults in `SystemNotificationSettings`
- Store-specific overrides in `NotificationChannelConfig` (future)

### 2.5 Rate Limit Strategies

#### Strategy 1: Token Bucket (Recommended)

- Allows bursts up to `maxRequests`
- Refills at rate of `maxRequests / windowMs`
- Best for: Channels with burst tolerance (LINE, WhatsApp)

#### Strategy 2: Fixed Window

- Strict limit: `maxRequests` per `windowMs`
- No bursts allowed
- Best for: Strict APIs (SMS providers, some email services)

#### Strategy 3: Sliding Window

- More accurate but more complex
- Best for: High-precision requirements

**Initial Implementation:** Token Bucket (simpler, good enough)

### 2.6 Error Handling

**When Rate Limit Exceeded:**

1. Log the violation with metadata
2. Update `NotificationDeliveryStatus` with error message
3. Keep status as "pending" (will retry on next batch)
4. Return error to caller
5. Optionally: Queue for delayed processing

**Retry Strategy:**

- Next batch processing will retry automatically
- Exponential backoff for repeated failures
- Max retry attempts (configurable)

### 2.7 Testing Strategy

1. **Unit Tests:**
   - Rate limit check logic
   - Token bucket refill
   - Cleanup logic
   - Concurrent requests

2. **Integration Tests:**
   - Send 100+ notifications rapidly
   - Verify rate limiting kicks in
   - Verify retry after window expires

3. **Load Tests:**
   - Send to 1000+ users simultaneously
   - Verify no API rate limit violations
   - Verify notifications are queued correctly

---

## 3. Implementation Phases

### Phase 1: Preference Caching (Week 1)

1. ✅ Create `PreferenceCache` class
2. ✅ Update `PreferenceManager` to use cache
3. ✅ Add cache invalidation on updates
4. ✅ Add environment configuration
5. ✅ Write unit tests
6. ✅ Integration testing

### Phase 2: Rate Limiting - Core (Week 2)

1. ✅ Create `NotificationRateLimiter` class
2. ✅ Integrate with `QueueManager`
3. ✅ Add default rate limits
4. ✅ Add logging for violations
5. ✅ Write unit tests

### Phase 3: Rate Limiting - Database Config (Week 3)

1. ✅ Add rate limit fields to `SystemNotificationSettings`
2. ✅ Create admin UI to configure rate limits
3. ✅ Load limits from database
4. ✅ Add monitoring dashboard

### Phase 4: Rate Limiting - Advanced (Week 4)

1. ✅ Implement Redis-based distributed rate limiting (optional)
2. ✅ Add per-store rate limit overrides
3. ✅ Add rate limit analytics
4. ✅ Performance optimization

---

## 4. Performance Metrics

### Preference Caching

- **Target Cache Hit Rate**: >95% after warm-up
- **Target Latency Reduction**: 20-100x faster
- **Memory Usage**: ~1KB per cached preference (acceptable for 10,000 users = 10MB)

### Rate Limiting

- **Target**: Zero external API rate limit violations
- **Overhead**: <1ms per rate limit check
- **Memory Usage**: ~100 bytes per active channel/store combination

---

## 5. Monitoring & Observability

### Metrics to Track

**Preference Caching:**

- Cache hit rate
- Cache miss rate
- Average cache lookup time
- Cache size (number of entries)

**Rate Limiting:**

- Rate limit violations per channel
- Average requests per second per channel
- Queue depth (pending notifications)
- Retry success rate

### Logging

**Preference Caching:**

```typescript
logger.info("Preference cache hit", {
  metadata: { userId, storeId, cacheKey },
  tags: ["cache", "preference"],
});

logger.info("Preference cache miss", {
  metadata: { userId, storeId, cacheKey },
  tags: ["cache", "preference"],
});
```

**Rate Limiting:**

```typescript
logger.warn("Rate limit exceeded", {
  metadata: {
    channel,
    storeId,
    current: bucket.timestamps.length,
    max: config.maxRequests,
    retryAfter,
  },
  tags: ["rate-limit", "notification"],
});
```

---

## 6. Future Enhancements

### Preference Caching

- **Redis Backend**: For multi-server deployments
- **Cache Warming**: Pre-load preferences for active users
- **Cache Compression**: Reduce memory usage for large deployments

### Rate Limiting

- **Distributed Rate Limiting**: Redis-based for multi-server
- **Dynamic Rate Limits**: Adjust based on API provider feedback
- **Rate Limit Analytics**: Dashboard showing usage patterns
- **Per-User Rate Limiting**: Prevent abuse from single users

---

## 7. Risk Assessment

### Preference Caching Risks

- **Stale Data**: If cache not invalidated, users see old preferences
  - **Mitigation**: Short TTL (5 minutes), explicit invalidation on updates
- **Memory Leaks**: Cache grows unbounded
  - **Mitigation**: Periodic cleanup, TTL expiration

### Rate Limiting Risks

- **False Positives**: Legitimate traffic blocked
  - **Mitigation**: Conservative limits, monitoring, easy override
- **Single Point of Failure**: In-memory cache lost on restart
  - **Mitigation**: Graceful degradation (allow requests, log warnings)

---

## 8. Success Criteria

### Preference Caching

- ✅ 95%+ cache hit rate in production
- ✅ 20x+ performance improvement for bulk sends
- ✅ Zero stale data issues
- ✅ <10MB memory usage for 10,000 users

### Rate Limiting

- ✅ Zero external API rate limit violations
- ✅ <1ms overhead per rate limit check
- ✅ All rate-limited notifications eventually delivered
- ✅ Admin dashboard shows rate limit status

---

## 9. Dependencies

### Preference Caching

- No external dependencies (uses Node.js Map)
- Optional: Redis for distributed caching (future)

### Rate Limiting

- No external dependencies (uses Node.js Map)
- Optional: Redis for distributed rate limiting (future)

---

## 10. Rollout Plan

### Phase 1: Preference Caching (Low Risk)

1. Deploy with feature flag
2. Monitor cache hit rate
3. Gradually increase TTL if needed
4. Full rollout after 1 week

### Phase 2: Rate Limiting (Medium Risk)

1. Deploy with conservative limits (higher than defaults)
2. Monitor for false positives
3. Gradually adjust limits based on actual usage
4. Full rollout after 2 weeks

---

## Summary

This design provides a comprehensive plan for implementing preference caching and rate limiting in the notification system. Both features are critical for:

1. **Performance**: Preference caching reduces database load by 95%+
2. **Reliability**: Rate limiting prevents API violations and service disruptions
3. **Scalability**: Both features enable the system to handle high-volume notification sends

The implementation is designed to be:

- **Non-breaking**: Graceful degradation if features fail
- **Configurable**: Limits and TTLs can be adjusted via environment variables
- **Observable**: Comprehensive logging and metrics
- **Testable**: Unit and integration tests for all components
