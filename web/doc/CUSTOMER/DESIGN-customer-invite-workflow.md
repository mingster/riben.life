# Design: Customer Invite Workflow

**Date:** 2025-01-27  
**Status:** Design  
**Related:** [Customer Import Specification](./SPEC-customer-import.md), [Authentication System](../auth)

## Overview

This document designs a customer invite workflow that allows imported or existing customers to claim and sign in to their accounts. When customers receive an invite URL (via email, SMS, or QR code), they can authenticate using their phone number (OTP) or OAuth providers (Google, LINE, Apple) to link their identity to the imported account.

## Goals

1. **Account Claiming:** Allow customers to claim imported accounts without passwords
2. **Flexible Authentication:** Support multiple authentication methods (phone OTP, OAuth)
3. **Account Linking:** Link OAuth accounts to existing imported accounts
4. **Security:** Ensure secure token-based invitation system
5. **User Experience:** Provide seamless onboarding experience
6. **Audit Trail:** Track invitation usage and authentication events

## User Flow

### High-Level Flow

```text
1. Store admin imports customer (or customer already exists)
   ↓
2. System generates invite token and URL
   ↓
3. Invite sent via email/SMS/QR code
   ↓
4. Customer clicks/scans invite URL
   ↓
5. Customer sees invite acceptance page
   ↓
6. Customer chooses authentication method:
   - Phone number + OTP
   - OAuth (Google, LINE, Apple)
   ↓
7. System verifies authentication
   ↓
8. System links authenticated account to imported customer
   ↓
9. Customer is signed in and redirected
```

### Detailed Flow

#### Step 1: Invite Generation

- Store admin imports customer via CSV (or customer already exists)
- System generates unique invite token
- Invite record created in database
- Invite URL generated: `https://riben.life/invite/{token}` (where token is a 6-character alphanumeric code)

#### Step 2: Invite Delivery

- **Email:** Send invite email with link (if email available)
- **SMS:** Send invite SMS with link (if phone number available)
- **QR Code:** Generate QR code for in-store display (if needed)
- **Manual:** Store admin can copy/share invite URL manually

#### Step 3: Customer Receives Invite

- Customer receives email/SMS with invite URL
- Or scans QR code in store
- Or receives link via other channel

#### Step 4: Customer Clicks Invite URL

- Customer navigates to `/invite/{token}` (6-character alphanumeric code)
- System validates token (not expired, not used, valid)
- If valid, show invite acceptance page
- If invalid, show error page

#### Step 5: Customer Chooses Authentication

**Option A: Phone Number + OTP**

- Customer enters phone number
- System sends OTP via SMS
- Customer enters OTP code
- System verifies OTP

**Option B: OAuth Provider**

- Customer clicks "Sign in with Google/LINE/Apple"
- Redirected to OAuth provider
- Customer authorizes
- Redirected back with OAuth credentials

#### Step 6: Account Linking

- System matches authenticated identity to imported customer:
  - **Phone OTP:** Match by phone number
  - **OAuth:** Match by email from OAuth provider
- If match found, link accounts
- If no match, create new account and link (fallback)

#### Step 7: Session Creation

- System creates authenticated session
- Customer is signed in
- Redirect to store homepage or specified callback URL

## Database Schema

### New Model: CustomerInvite

```prisma
model CustomerInvite {
  id            String   @id @default(cuid())
  token         String   @unique // Unique 6-character alphanumeric invite code
  userId        String   // User ID of imported/existing customer
  storeId       String   // Store that sent the invite
  organizationId String   // Organization ID (for member relationship)
  
  // Invite metadata
  invitedBy     String   // User ID of store admin who created invite
  invitedAt     BigInt   // Epoch timestamp when invite was created
  expiresAt     BigInt   // Epoch timestamp when invite expires
  usedAt        BigInt?  // Epoch timestamp when invite was used (null if unused)
  
  // Usage tracking
  accessedAt    BigInt?  // First time invite URL was accessed
  accessCount   Int      @default(0) // Number of times invite URL was accessed
  
  // Relations
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  store         Store    @relation(fields: [storeId], references: [id], onDelete: Cascade)
  inviter       User     @relation("Inviter", fields: [invitedBy], references: [id])
  
  @@index([token])
  @@index([userId])
  @@index([storeId])
  @@index([expiresAt])
  @@map("customer_invite")
}
```

### Updates to Existing Models

#### User Model

No changes needed - existing fields are sufficient.

#### Member Model

No changes needed - existing model supports organization membership.

#### Account Model (Better Auth)

No changes needed - Better Auth handles OAuth account linking automatically.

## API Endpoints

### 1. Generate Invite

**Endpoint:** `POST /api/storeAdmin/[storeId]/customers/[userId]/invite`

**Authentication:** Store admin access required

**Request Body:**

```typescript
{
  deliveryMethod?: "email" | "sms" | "both" | "none"; // Default: "both" if available
  expiresInDays?: number; // Default: 7 days
  callbackUrl?: string; // URL to redirect after acceptance
}
```

**Response:**

```typescript
{
  success: true;
  invite: {
    id: string;
    token: string;
    url: string; // Full invite URL
    expiresAt: number; // Epoch timestamp
    qrCode?: string; // Base64 QR code image (optional)
  };
  sent: {
    email: boolean;
    sms: boolean;
  };
}
```

**Implementation:**

- Generate unique 6-character alphanumeric token
- Create CustomerInvite record
- Send email/SMS if requested
- Generate QR code if needed
- Return invite details

### 2. Validate Invite Token

**Endpoint:** `GET /api/invite/[token]/validate`

**Authentication:** None (public endpoint)

**Response:**

```typescript
{
  valid: boolean;
  invite?: {
    id: string;
    userId: string;
    storeId: string;
    expiresAt: number;
    used: boolean;
    userName?: string;
    storeName?: string;
  };
  error?: string;
}
```

**Implementation:**

- Look up invite by token
- Check if expired
- Check if already used
- Return validation result

### 3. Accept Invite (Phone OTP)

**Endpoint:** `POST /api/invite/[token]/accept/phone`

**Authentication:** None (public endpoint)

**Request Body:**

```typescript
{
  phoneNumber: string; // E.164 format
  otp: string; // OTP code
}
```

**Response:**

```typescript
{
  success: boolean;
  session?: {
    user: User;
    session: Session;
  };
  error?: string;
}
```

**Implementation:**

- Validate invite token
- Verify phone number matches imported customer
- Verify OTP code
- Link phone number to user account
- Create session
- Mark invite as used

### 4. Accept Invite (OAuth)

**Endpoint:** `GET /api/invite/[token]/accept/oauth/[provider]`

**Authentication:** OAuth flow (redirects to provider)

**Query Parameters:**

- `token`: Invite token
- `provider`: "google" | "line" | "apple"

**Response:**

- Redirects to OAuth provider
- After OAuth callback, links account and creates session

**Implementation:**

- Validate invite token
- Store token in session/cookie for OAuth callback
- Redirect to OAuth provider with callback URL
- On callback, match OAuth email to imported customer
- Link OAuth account to user
- Create session
- Mark invite as used

### 5. Resend Invite

**Endpoint:** `POST /api/storeAdmin/[storeId]/customers/[userId]/invite/resend`

**Authentication:** Store admin access required

**Request Body:**

```typescript
{
  deliveryMethod?: "email" | "sms" | "both";
}
```

**Response:**

```typescript
{
  success: boolean;
  sent: {
    email: boolean;
    sms: boolean;
  };
  error?: string;
}
```

**Implementation:**

- Find existing invite (or create new if expired)
- Send email/SMS with invite URL
- Update sentAt and sentVia fields

## UI Components

### 1. Invite Acceptance Page

**Path:** `/invite/[token]` (token is 6-character alphanumeric code)

**Component:** `web/src/app/(root)/invite/[token]/page.tsx`

**Features:**

- Display invite information (store name, customer name if available)
- Show authentication options:
  - Phone number + OTP form
  - OAuth buttons (Google, LINE, Apple)
- Handle authentication flow
- Show loading states
- Display error messages
- Redirect after successful authentication

**UI Layout:**

```text
┌─────────────────────────────────┐
│  Invite Acceptance              │
├─────────────────────────────────┤
│  You've been invited to join    │
│  [Store Name]                   │
│                                 │
│  ┌───────────────────────────┐ │
│  │ Phone Number + OTP        │ │
│  │ [Phone input]             │ │
│  │ [OTP input]               │ │
│  │ [Verify Button]           │ │
│  └───────────────────────────┘ │
│                                 │
│  ───────── OR ─────────         │
│                                 │
│  ┌───────────────────────────┐ │
│  │ [Sign in with Google]    │ │
│  │ [Sign in with LINE]      │ │
│  │ [Sign in with Apple]     │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

### 2. Invite Generation Dialog

**Component:** `web/src/app/storeAdmin/(dashboard)/[storeId]/(routes)/customers/components/send-invite-dialog.tsx`

**Features:**

- Triggered from customer list/management page
- Options for delivery method
- Generate and display invite URL
- Option to copy URL
- Option to generate QR code
- Send email/SMS buttons
- Show invite status (sent, expired, used)

### 3. Invite Status Badge

**Component:** `web/src/app/storeAdmin/(dashboard)/[storeId]/(routes)/customers/components/invite-status-badge.tsx`

**Features:**

- Display invite status for each customer
- Show "Invited", "Accepted", "Expired", "Not Invited"
- Click to resend invite or view details

## Implementation Details

### Token Generation

```typescript
import crypto from "crypto";

function generateInviteToken(): string {
  // Generate 6-character alphanumeric code
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 6; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    token += chars[randomIndex];
  }
  return token;
}
```

**Security Considerations:**

- Use cryptographically secure random generator (`crypto.randomInt`)
- 6 characters with 36 possible values (A-Z, 0-9) = 36^6 = 2,176,782,336 possible combinations
- Tokens are unique (enforced by database unique constraint)
- Shorter tokens are more user-friendly for manual entry
- Consider rate limiting and expiration to mitigate brute force attempts

### Invite Expiration

```typescript
const DEFAULT_EXPIRATION_DAYS = 7;

function calculateExpiration(days: number = DEFAULT_EXPIRATION_DAYS): bigint {
  const now = Date.now();
  const expiresAt = now + (days * 24 * 60 * 60 * 1000);
  return BigInt(expiresAt);
}
```

**Default:** 7 days from creation
**Configurable:** Store admin can specify expiration period

### Phone Number Matching

```typescript
async function matchUserByPhone(
  phoneNumber: string,
  userId: string,
): Promise<boolean> {
  const user = await sqlClient.user.findUnique({
    where: { id: userId },
  });
  
  if (!user) return false;
  
  // Normalize phone numbers for comparison
  const normalizedInput = normalizePhoneNumber(phoneNumber);
  const normalizedUser = normalizePhoneNumber(user.phoneNumber || "");
  
  return normalizedInput === normalizedUser;
}
```

**Normalization:**

- Convert to E.164 format
- Remove spaces, dashes, parentheses
- Handle Taiwan numbers (+8860 → +886)

### OAuth Email Matching

```typescript
async function matchUserByOAuthEmail(
  oauthEmail: string,
  userId: string,
): Promise<boolean> {
  const user = await sqlClient.user.findUnique({
    where: { id: userId },
  });
  
  if (!user) return false;
  
  // Normalize emails for comparison (lowercase)
  const normalizedInput = oauthEmail.toLowerCase().trim();
  const normalizedUser = (user.email || "").toLowerCase().trim();
  
  return normalizedInput === normalizedUser;
}
```

**Account Linking:**

- Better Auth handles OAuth account linking automatically
- If email matches, Better Auth will link accounts
- If no match, new account created and linked (fallback)

### Email Template

**Template ID:** `CustomerInvite.Email`

**Variables:**

- `{{customerName}}`: Customer name
- `{{storeName}}`: Store name
- `{{inviteUrl}}`: Full invite URL
- `{{expiresAt}}`: Expiration date/time
- `{{qrCode}}`: QR code image (optional)

**Subject:** `You've been invited to join {{storeName}}`

**Body:**

```text
Hello {{customerName}},

You've been invited to join {{storeName}}.

Click the link below to accept your invitation:
{{inviteUrl}}

This invitation expires on {{expiresAt}}.

Or scan this QR code:
[QR Code Image]

If you didn't expect this invitation, you can safely ignore this email.
```

### SMS Template

**Template ID:** `CustomerInvite.SMS`

**Variables:**

- `{{storeName}}`: Store name
- `{{inviteUrl}}`: Shortened invite URL (if available)

**Message:**

```text
You've been invited to join {{storeName}}. Accept your invitation: {{inviteUrl}}
```

**Note:** SMS has character limits, so use shortened URL if available.

## Security Considerations

### Token Security

1. **Unique Tokens:** Each invite has a unique 6-character alphanumeric code (A-Z, 0-9)
2. **Cryptographically Secure:** Uses `crypto.randomInt()` for secure random generation
3. **Expiration:** Tokens expire after configurable period (default 7 days)
4. **Single Use:** Tokens can be marked as used (optional - may allow multiple uses for same customer)
5. **Rate Limiting:** Limit invite generation per customer per time period
6. **Brute Force Protection:** Rate limit token validation attempts per IP address
7. **Token Storage:** Tokens stored securely in database, not in logs
8. **Entropy:** 36^6 = ~2.2 billion possible combinations (sufficient with expiration and rate limiting)

### Authentication Security

1. **Phone OTP:** Uses existing Better Auth OTP system (rate limited, secure)
2. **OAuth:** Uses existing Better Auth OAuth system (secure, industry standard)
3. **Account Linking:** Better Auth handles secure account linking
4. **Session Security:** Uses existing Better Auth session management

### Access Control

1. **Invite Generation:** Only store admins can generate invites
2. **Invite Acceptance:** Public endpoint (no authentication required)
3. **Account Matching:** System verifies phone/email matches imported customer
4. **Audit Trail:** All invite events logged for security auditing

### Privacy

1. **Data Minimization:** Only necessary data included in invite
2. **Expiration:** Invites expire automatically
3. **Revocation:** Store admins can revoke unused invites
4. **GDPR Compliance:** Customers can request invite deletion

## Error Handling

### Invalid Token

**Scenario:** Token doesn't exist, expired, or already used

**Response:**

- Show error page: "This invitation is invalid or has expired"
- Option to request new invitation
- Link to contact store support

### Phone Number Mismatch

**Scenario:** Customer enters phone number that doesn't match imported customer

**Response:**

- Show error: "Phone number doesn't match. Please use the phone number associated with your account."
- Allow retry
- Option to use OAuth instead

### OAuth Email Mismatch

**Scenario:** OAuth email doesn't match imported customer email

**Response:**

- Show error: "Email doesn't match. Please use the email associated with your account."
- Option to use phone number instead
- Option to contact support for account linking

### OAuth Account Already Linked

**Scenario:** OAuth account is already linked to different user

**Response:**

- Better Auth handles this automatically
- If account linking enabled, may link to existing account
- Show appropriate message based on Better Auth behavior

## Integration Points

### Better Auth Integration

1. **Phone OTP:** Use `authClient.phoneNumber.sendOtp()` and `authClient.phoneNumber.verify()`
2. **OAuth:** Use `authClient.signIn.social()` with provider
3. **Account Linking:** Better Auth handles automatically with `accountLinking.enabled: true`
4. **Session:** Use `authClient.getSession()` after authentication

### Email System Integration

1. **Template System:** Use existing message template system
2. **Email Queue:** Use existing `emailQueue` table
3. **Sending:** Use existing `sendMail()` function

### SMS System Integration

1. **SMS Sending:** Use existing Mitake SMS or Twilio integration
2. **Template System:** Use existing message template system (if available)
3. **Rate Limiting:** Use existing OTP rate limiting

### Notification System Integration

1. **On-site Notification:** Create notification when invite is accepted
2. **Email Notification:** Send confirmation email after acceptance
3. **Store Admin Notification:** Notify store admin when customer accepts invite

## Testing Scenarios

### Happy Path

1. **Phone OTP Flow:**
   - Generate invite
   - Customer receives SMS
   - Customer clicks link
   - Customer enters phone number
   - Customer receives OTP
   - Customer enters OTP
   - Account linked, session created
   - Customer redirected

2. **OAuth Flow:**
   - Generate invite
   - Customer receives email
   - Customer clicks link
   - Customer clicks "Sign in with Google"
   - OAuth flow completes
   - Account linked, session created
   - Customer redirected

### Edge Cases

1. **Expired Invite:**
   - Customer clicks expired invite
   - Error shown
   - Option to request new invite

2. **Already Used Invite:**
   - Customer clicks already used invite
   - Error shown or redirect to sign in

3. **Phone Number Not Provided:**
   - Imported customer has no phone number
   - Only OAuth options shown

4. **Email Not Provided:**
   - Imported customer has no email
   - Only phone OTP option shown

5. **Multiple Invites:**
   - Customer receives multiple invites
   - All tokens work until one is used
   - After use, all related invites marked as used

6. **OAuth Account Already Exists:**
   - Customer's OAuth account already linked to different user
   - Better Auth handles account linking
   - Show appropriate message

### Error Cases

1. **Invalid Token Format:**
   - Malformed token in URL (wrong length, invalid characters)
   - Show error: "Invalid invitation code. Please check the code and try again."
   - 404 error page or validation error page

2. **Database Error:**
   - Database connection fails
   - Show error, log for admin

3. **SMS Send Failure:**
   - SMS provider error
   - Log error, show invite URL manually

4. **Email Send Failure:**
   - Email provider error
   - Log error, show invite URL manually

## Performance Considerations

### Database Queries

- **Token Lookup:** Indexed by token (fast)
- **User Lookup:** Indexed by userId (fast)
- **Expiration Check:** Indexed by expiresAt (fast for cleanup)

### Caching

- **Token Validation:** Cache validation results for short period (5 minutes)
- **User Data:** Cache user/store data for invite page

### Rate Limiting

- **Invite Generation:** Limit per store admin per time period
- **Token Validation:** Limit validation requests per IP
- **Acceptance:** Use existing OTP/OAuth rate limiting

## Monitoring and Logging

### Log Events

1. **Invite Generated:**
   - Log: invite ID, user ID, store ID, inviter ID, expiration

2. **Invite Sent:**
   - Log: invite ID, delivery method, sent status

3. **Invite Accessed:**
   - Log: invite ID, IP address, user agent, timestamp

4. **Invite Accepted:**
   - Log: invite ID, authentication method, user ID, timestamp

5. **Invite Expired:**
   - Log: invite ID, expiration timestamp

### Metrics

- Invite generation rate
- Invite acceptance rate
- Average time to acceptance
- Authentication method distribution (phone vs OAuth)
- Error rates by type

## Future Enhancements

### Potential Improvements

1. **Bulk Invites:** Send invites to multiple customers at once
2. **Custom Expiration:** Per-invite expiration settings
3. **Invite Templates:** Customizable email/SMS templates per store
4. **Analytics Dashboard:** Track invite performance metrics
5. **Reminder Emails:** Send reminder emails before expiration
6. **QR Code Generation:** Automatic QR code for in-store display
7. **Short URLs:** Generate shortened invite URLs for SMS
8. **Invite Revocation:** Allow store admins to revoke unused invites
9. **Multi-language Support:** Invite content in customer's locale
10. **Social Sharing:** Allow customers to share invite with others

## Related Documentation

- [Customer Import Specification](./SPEC-customer-import.md)
- [Authentication System](../auth)
- [Notification System](./NOTIFICATION/FUNCTIONAL-REQUIREMENTS-NOTIFICATION.md)
- [Better Auth Documentation](https://better-auth.com)

## Code References

### Frontend Components

- **Invite Page:** `web/src/app/(root)/invite/[token]/page.tsx`
- **Invite Dialog:** `web/src/app/storeAdmin/(dashboard)/[storeId]/(routes)/customers/components/send-invite-dialog.tsx`
- **Invite Status:** `web/src/app/storeAdmin/(dashboard)/[storeId]/(routes)/customers/components/invite-status-badge.tsx`

### Backend API

- **Generate Invite:** `web/src/app/api/storeAdmin/[storeId]/customers/[userId]/invite/route.ts`
- **Validate Invite:** `web/src/app/api/invite/[token]/validate/route.ts`
- **Accept Invite (Phone):** `web/src/app/api/invite/[token]/accept/phone/route.ts`
- **Accept Invite (OAuth):** `web/src/app/api/invite/[token]/accept/oauth/[provider]/route.ts`

### Actions

- **Generate Invite Action:** `web/src/actions/storeAdmin/customer/generate-invite.ts`
- **Send Invite Email:** `web/src/actions/mail/send-customer-invite.ts`
- **Send Invite SMS:** `web/src/actions/sms/send-customer-invite.ts`

### Database

- **Schema:** `web/prisma/schema.prisma` (CustomerInvite model)

## Summary

The customer invite workflow provides a secure, flexible way for imported customers to claim and sign in to their accounts. It supports multiple authentication methods (phone OTP and OAuth), integrates seamlessly with the existing Better Auth system, and provides a smooth user experience. The system is designed to be secure, scalable, and maintainable, with comprehensive error handling and monitoring capabilities.
