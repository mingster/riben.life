# Functional Requirements: Phone Login with Knock

**Date:** 2025-01-27  
**Status:** Active  
**Version:** 1.1

**Related Documents:**

* [SECURITY.md](../SECURITY.md)
* [ENVIRONMENT_VARIABLES.md](../ENVIRONMENT_VARIABLES.md)

***

## 1. Overview

This document specifies the functional requirements for implementing phone number-based authentication (phone login) using Knock as the SMS/OTP provider. The system enables users to sign in and sign up using their phone number instead of (or in addition to) email addresses.

**Key Features:**

* Phone number-based user authentication (sign in/sign up)
* One-Time Password (OTP) verification via SMS
* Phone number verification and linking
* Integration with existing Better Auth authentication system
* Support for multiple authentication methods (phone, email, social)
* Account linking for users with multiple authentication methods

**Provider:** Knock (<https://knock.app>) - SMS/OTP delivery service

***

## 2. System Actors

### 2.1 End User

* New users (signing up with phone number)
* Existing users (signing in with phone number)
* Users linking phone number to existing account
* Users verifying phone number for account security

### 2.2 System Admin

* Platform administrators
* Can configure Knock API credentials
* Can view authentication logs and metrics
* Can manage phone verification settings

***

## 3. Core Functional Requirements

### 3.1 Phone Number Authentication

#### 3.1.1 Combined Sign In/Sign Up with Phone Number

**FR-PHONE-001:** Users must be able to authenticate using their phone number, regardless of whether they have an existing account.

**FR-PHONE-002:** The authentication flow must automatically handle both sign-up and sign-in:

1. **Phone Number Input:**
   * User enters phone number in international format (e.g., +886912345678)
   * System validates phone number format
   * User does not need to know if they have an account or not

2. **OTP Verification:**
   * System sends OTP code to phone number via Knock
   * User enters OTP code received via SMS
   * System verifies OTP code (stored in database)
   * OTP code expires after configured time (default: 10 minutes)

3. **Automatic Account Handling:**
   * System checks if phone number is registered
   * **If phone number is NOT registered:**
     * System automatically creates new user account
     * Phone number is stored and marked as verified (`phoneNumberVerified = true`)
     * User is signed in
   * **If phone number IS registered:**
     * User is signed in with existing account
   * No account creation needed
   * User is redirected to requested page or dashboard

**FR-PHONE-003:** The system must provide feedback about account status:

* Response includes `isNewUser` flag indicating if account was just created
* UI can display appropriate welcome message for new users
* Existing users proceed directly to their dashboard

**FR-PHONE-004:** Users must be able to sign in using their phone number (same flow as above).

**FR-PHONE-005:** The sign-in/sign-up flow must be seamless:

* Single action handles both sign-up and sign-in
* No separate "Sign Up" vs "Sign In" buttons needed for phone authentication
* Users enter phone number and OTP code, system handles the rest

**FR-PHONE-006:** The system must support "Remember Me" functionality:

* User can opt to extend session duration
* Session expiration follows existing Better Auth session configuration

#### 3.1.3 Phone Number Verification

**FR-PHONE-007:** Users must be able to verify their phone number for account security.

**FR-PHONE-008:** Phone number verification flow:

1. **Initiate Verification:**
   * User requests phone number verification (from account settings)
   * System sends OTP code to phone number via Knock

2. **Verify OTP:**
   * User enters OTP code
   * System verifies OTP code with Knock
   * If valid: `phoneNumberVerified` flag is set to `true`

3. **Verification Status:**
   * System displays verification status in user profile
   * Verified phone numbers are marked with verification badge

**FR-PHONE-009:** Users must be able to update their phone number:

* User can change phone number in account settings
* New phone number must be verified via OTP
* Old phone number is unverified until new one is verified
* System logs phone number change for security audit

#### 3.1.4 Account Linking

**FR-PHONE-010:** Users must be able to link phone number to existing account.

**FR-PHONE-011:** Account linking flow:

1. **User is signed in** (via email, social login, etc.)
2. **User adds phone number:**
   * User enters phone number in account settings
   * System checks if phone number is already registered to another account
   * If not registered: System sends OTP code via Knock
   * If registered: System displays error message

3. **Verify and Link:**
   * User enters OTP code
   * System verifies OTP code with Knock
   * If valid: Phone number is linked to user account and marked as verified

**FR-PHONE-012:** The system must support multiple authentication methods per user:

* User can have both email and phone number
* User can sign in with either email or phone number
* User can link social accounts (Google, LINE, Apple) with phone number
* Account linking follows Better Auth account linking rules

### 3.2 OTP Management

#### 3.2.1 OTP Generation and Delivery

**FR-PHONE-013:** The system must generate secure OTP codes:

* OTP code must be 6 digits (numeric)
* OTP code must be cryptographically random
* OTP code must be unique per request
* OTP code must expire after configured time (default: 10 minutes)

**FR-PHONE-014:** The system must send OTP codes via Knock:

* Integration with Knock SMS API
* OTP code is sent to user's phone number
* SMS message includes OTP code and brief instructions
* SMS is sent in user's preferred language (if supported by Knock)

**FR-PHONE-015:** The system must handle OTP delivery failures:

* If SMS delivery fails, system displays error message
* User can request new OTP code
* System logs delivery failures for monitoring

#### 3.2.2 OTP Verification

**FR-PHONE-016:** The system must verify OTP codes with Knock:

* OTP verification request is sent to Knock API
* Knock validates OTP code against sent code
* System receives verification result from Knock
* If valid: User is authenticated or phone number is verified
* If invalid: System displays error message and allows retry

**FR-PHONE-017:** The system must implement rate limiting for OTP requests:

* Maximum 3 OTP requests per phone number per 15 minutes
* Maximum 5 OTP requests per phone number per hour
* Maximum 10 OTP requests per phone number per day
* Rate limit violations are logged and user is notified

**FR-PHONE-018:** The system must implement OTP attempt limits:

* Maximum 5 OTP verification attempts per code
* After 5 failed attempts, OTP code is invalidated
* User must request new OTP code after failed attempts
* Failed attempts are logged for security monitoring

#### 3.2.3 OTP Resend

**FR-PHONE-019:** Users must be able to request new OTP code:

* "Resend OTP" button available after initial OTP send
* Resend is subject to rate limiting (see FR-PHONE-017)
* New OTP code invalidates previous code
* Resend countdown timer (e.g., "Resend in 60 seconds")

### 3.3 Phone Number Management

#### 3.3.1 Phone Number Format

**FR-PHONE-020:** The system must accept phone numbers in international format:

* Format: `+[country code][number]` (e.g., +886912345678)
* Country code is required
* Leading zeros are removed
* Spaces, dashes, and parentheses are stripped

**FR-PHONE-021:** The system must validate phone number format:

* Phone number must match international format
* Country code must be valid
* Number length must be within acceptable range (7-15 digits)
* Invalid format displays clear error message

**FR-PHONE-022:** The system must normalize phone numbers:

* All phone numbers stored in normalized format (E.164)
* Phone numbers are normalized before storage and comparison
* Display format can differ from storage format (user-friendly display)

#### 3.3.2 Phone Number Uniqueness

**FR-PHONE-023:** Phone numbers must be unique per user account:

* System prevents duplicate phone numbers across accounts
* Exception: Phone number can be linked to same account multiple times (if user updates phone number)

**FR-PHONE-024:** The system must handle phone number conflicts:

* If user tries to link a phone number that is already registered to another account:
  * System displays error: "This phone number is already registered to another account"
  * User cannot link the phone number
  * User must use a different phone number or contact support
* Note: For authentication (sign-in/sign-up), phone numbers are automatically handled - existing users sign in, new users are signed up

### 3.4 User Experience

#### 3.4.1 Sign Up/Sign In UI

**FR-PHONE-025:** The authentication UI must support phone number input:

* Phone number input field with country code selector
* Format validation with real-time feedback
* Clear error messages for invalid formats
* Mobile-optimized input (numeric keyboard on mobile devices)

**FR-PHONE-026:** The OTP verification UI must be user-friendly:

* OTP input field (6 digits, auto-focus)
* Clear instructions: "Enter the 6-digit code sent to [phone number]"
* Resend OTP button with countdown timer
* Loading states during OTP send and verification
* Success/error feedback messages

**FR-PHONE-027:** The system must support multiple authentication methods:

* Sign in page shows options: Email, Phone, Social (Google, LINE, Apple)
* Users can switch between authentication methods
* Consistent UI/UX across all authentication methods

#### 3.4.2 Error Handling

**FR-PHONE-028:** The system must display clear error messages:

* Invalid phone number format
* Invalid OTP code
* OTP code expired
* Rate limit exceeded
* SMS delivery failure
* Phone number already linked to another account (for account linking)

**FR-PHONE-029:** Error messages must be user-friendly and actionable:

* Error messages explain what went wrong
* Error messages suggest how to fix the issue
* Error messages are translated (i18n support)

#### 3.4.3 Account Settings

**FR-PHONE-030:** Users must be able to manage phone number in account settings:

* View current phone number (masked for privacy: +886****5678)
* Add phone number (if not set)
* Update phone number (requires verification)
* Remove phone number (requires confirmation)
* View verification status

**FR-PHONE-031:** Phone number changes must require verification:

* When user updates phone number, new number must be verified via OTP
* Old phone number remains verified until new one is verified
* System sends notification to old phone number (if possible) about change

### 3.5 Security Requirements

#### 3.5.1 Rate Limiting

**FR-PHONE-032:** The system must implement rate limiting for OTP requests:

* **Per Phone Number:**
  * Maximum 3 OTP requests per 15 minutes
  * Maximum 5 OTP requests per hour
  * Maximum 10 OTP requests per 24 hours

* **Per IP Address:**
  * Maximum 10 OTP requests per 15 minutes
  * Maximum 20 OTP requests per hour
  * Maximum 50 OTP requests per 24 hours

**FR-PHONE-033:** Rate limit violations must be handled gracefully:

* User receives clear error message: "Too many requests. Please try again later."
* Rate limit reset time is displayed
* Violations are logged for security monitoring

#### 3.5.2 OTP Security

**FR-PHONE-034:** OTP codes must be secure:

* OTP codes are cryptographically random
* OTP codes are single-use (invalidated after successful verification)
* OTP codes expire after 10 minutes (configurable)
* OTP codes are not stored in plain text (hashed or encrypted)

**FR-PHONE-035:** The system must prevent OTP brute force attacks:

* Maximum 5 OTP verification attempts per code
* After 5 failed attempts, OTP code is invalidated
* Failed attempts are logged
* Account may be temporarily locked after repeated failures

#### 3.5.3 Phone Number Privacy

**FR-PHONE-036:** Phone numbers must be protected:

* Phone numbers are stored securely (encrypted at rest)
* Phone numbers are masked in UI (e.g., +886****5678)
* Phone numbers are only visible to:
  * The user (their own phone number)
  * System admins (for support purposes)
  * Store admins (if user is store member, for contact purposes)

**FR-PHONE-037:** The system must comply with data protection regulations:

* Phone numbers are collected only with user consent
* Users can delete their phone number
* Phone numbers are deleted when account is deleted
* Phone numbers are not shared with third parties (except Knock for SMS delivery)

### 3.6 Integration Requirements

#### 3.6.1 Knock Integration

**FR-PHONE-038:** The system must integrate with Knock API:

* **Authentication:**
  * API key authentication with Knock
  * API keys stored securely (environment variables)
  * API keys are different for development and production

* **SMS Delivery:**
  * Send OTP codes via Knock SMS API
  * Handle SMS delivery status (sent, delivered, failed)
  * Retry failed SMS deliveries (up to 3 attempts)

* **OTP Verification:**
  * Verify OTP codes via Knock API
  * Handle verification responses (valid, invalid, expired)
  * Log verification attempts for audit

**FR-PHONE-039:** The system must handle Knock API errors:

* Network errors (retry with exponential backoff)
* API errors (invalid API key, rate limit, etc.)
* Service unavailability (graceful degradation)
* Error logging and monitoring

#### 3.6.2 Better Auth Integration

**FR-PHONE-040:** Phone authentication must integrate with Better Auth:

* Use Better Auth `phoneOTP` plugin
* Implement `sendOTP` callback to send OTP via Knock
* Implement `verifyOTP` callback to verify OTP via Knock
* Store phone number in user's `phoneNumber` field
* Update `phoneNumberVerified` flag on successful verification

**FR-PHONE-041:** Phone authentication must work with existing authentication methods:

* Users can sign in with email OR phone number
* Users can link phone number to existing email account
* Users can link email to existing phone account
* Account linking follows Better Auth rules

**FR-PHONE-042:** Phone authentication must respect Better Auth session management:

* Session creation follows Better Auth session configuration
* Session expiration follows Better Auth settings
* Multi-session support (if enabled)
* Session refresh and renewal

### 3.7 Notification Requirements

#### 3.7.1 SMS Notifications

**FR-PHONE-043:** The system must send SMS notifications via Knock:

* OTP codes for sign up
* OTP codes for sign in
* OTP codes for phone number verification
* OTP codes for phone number updates

**FR-PHONE-044:** SMS messages must be clear and concise:

* Include OTP code (6 digits)
* Include brief instructions
* Include expiration time
* Include app name/brand
* Support multiple languages (if configured)

**FR-PHONE-045:** SMS message format example:

```
Your riben.life verification code is: 123456
This code will expire in 10 minutes.
Do not share this code with anyone.
```

#### 3.7.2 Email Notifications (Optional)

**FR-PHONE-046:** The system may send email notifications for phone-related activities:

* Phone number added to account
* Phone number updated
* Phone number verification completed
* Suspicious activity detected (optional)

### 3.8 Logging and Monitoring

#### 3.8.1 Authentication Logging

**FR-PHONE-047:** The system must log phone authentication events:

* OTP send requests (phone number, timestamp, status)
* OTP verification attempts (phone number, timestamp, result)
* Sign up with phone number (user ID, phone number, timestamp)
* Sign in with phone number (user ID, phone number, timestamp)
* Phone number updates (user ID, old phone, new phone, timestamp)
* Rate limit violations (phone number, IP address, timestamp)

**FR-PHONE-048:** Logs must include security-relevant information:

* IP address
* User agent
* Timestamp
* Success/failure status
* Error messages (if applicable)

#### 3.8.2 Monitoring and Alerts

**FR-PHONE-049:** The system must monitor phone authentication metrics:

* OTP send success rate
* OTP verification success rate
* SMS delivery success rate
* Rate limit violations
* Failed authentication attempts
* Average OTP verification time

**FR-PHONE-050:** The system must alert on anomalies:

* High rate of failed OTP verifications
* High rate of SMS delivery failures
* Unusual rate limit violations
* Potential brute force attacks

***

## 4. Data Requirements

### 4.1 User Data Model

**FR-PHONE-051:** The system must store phone number information:

* `phoneNumber` (String, optional) - User's phone number in E.164 format
* `phoneNumberVerified` (Boolean, default: false) - Phone number verification status

**FR-PHONE-052:** Phone number storage requirements:

* Phone numbers stored in normalized format (E.164: +[country code][number])
* Phone numbers are encrypted at rest
* Phone numbers are indexed for fast lookup
* Phone numbers have unique constraint (one phone number per user)

### 4.2 OTP Data Model

**FR-PHONE-053:** The system must track OTP codes (temporarily):

* OTP code (hashed or encrypted)
* Phone number
* Expiration timestamp
* Verification attempts count
* Created timestamp

**FR-PHONE-054:** OTP data retention:

* OTP codes are deleted after successful verification
* OTP codes are deleted after expiration
* OTP codes are deleted after maximum failed attempts
* OTP codes are not stored permanently (only in memory/cache)

### 4.3 Audit Log Data Model

**FR-PHONE-055:** The system must store audit logs:

* Event type (OTP send, OTP verify, sign up, sign in, phone update)
* User ID (if available)
* Phone number (masked for privacy)
* IP address
* User agent
* Timestamp
* Success/failure status
* Error message (if applicable)

***

## 5. Business Rules

### 5.1 Phone Number Rules

**BR-PHONE-001:** Phone numbers must be in international format (E.164).

**BR-PHONE-002:** Phone numbers must be unique per user account.

**BR-PHONE-003:** Phone numbers must be verified before use for authentication.

**BR-PHONE-004:** Users can have only one verified phone number at a time.

**BR-PHONE-005:** Users can update phone number, but new number must be verified.

### 5.2 OTP Rules

**BR-PHONE-006:** OTP codes must be 6 digits (numeric).

**BR-PHONE-007:** OTP codes expire after 10 minutes (configurable).

**BR-PHONE-008:** OTP codes are single-use (invalidated after verification).

**BR-PHONE-009:** Maximum 5 OTP verification attempts per code.

**BR-PHONE-010:** Rate limiting applies to OTP requests (see FR-PHONE-032).

### 5.3 Authentication Rules

**BR-PHONE-011:** Users can sign in with phone number OR email (if both are set).

**BR-PHONE-012:** Users can link phone number to existing account (email, social).

**BR-PHONE-013:** Phone number authentication follows Better Auth session rules.

**BR-PHONE-014:** Account linking follows Better Auth account linking rules.

### 5.4 Security Rules

**BR-PHONE-015:** Rate limiting prevents abuse of OTP requests.

**BR-PHONE-016:** Failed OTP attempts are logged and monitored.

**BR-PHONE-017:** Phone numbers are encrypted at rest and masked in UI.

**BR-PHONE-018:** OTP codes are not stored in plain text.

***

## 6. User Interface Requirements

### 6.1 Sign Up/Sign In Pages

**UI-PHONE-001:** Sign up page must support phone number input:

* Phone number input field with country code selector
* Format validation with real-time feedback
* "Send OTP" button
* Clear instructions and error messages

**UI-PHONE-002:** OTP verification page must be user-friendly:

* 6-digit OTP input field (auto-focus)
* Clear instructions: "Enter the code sent to [phone number]"
* "Resend OTP" button with countdown timer
* Loading states and success/error feedback

**UI-PHONE-003:** Sign in page must support phone number:

* Phone number input field
* OTP verification flow
* Option to switch to email/social login

### 6.2 Account Settings

**UI-PHONE-004:** Account settings must show phone number management:

* Current phone number (masked: +886****5678)
* Verification status badge
* "Add Phone Number" button (if not set)
* "Update Phone Number" button (if set)
* "Remove Phone Number" button (if set)

**UI-PHONE-005:** Phone number update flow:

* Phone number input field
* OTP verification step
* Confirmation before update
* Success/error feedback

### 6.3 Mobile Optimization

**UI-PHONE-006:** Phone authentication UI must be mobile-optimized:

* Numeric keyboard for phone number input
* Numeric keyboard for OTP input
* Touch-friendly buttons and inputs
* Responsive layout for all screen sizes
* Minimum 44x44px touch targets

***

## 7. Technical Requirements

### 7.1 Knock API Integration

**TR-PHONE-001:** The system must integrate with Knock API:

* **API Endpoints:**
  * Send OTP: `POST /v1/users/{user_id}/workflows/{workflow_key}/trigger`
  * Verify OTP: `POST /v1/users/{user_id}/workflows/{workflow_key}/verify`
  * (Exact endpoints depend on Knock API version and configuration)

* **Authentication:**
  * API key authentication
  * API keys stored in environment variables
  * Separate keys for development and production

* **Request Format:**
  * JSON request body
  * Phone number in E.164 format
  * OTP code (for verification)

* **Response Handling:**
  * Success responses (200 OK)
  * Error responses (400, 401, 429, 500, etc.)
  * Retry logic for transient errors

**TR-PHONE-002:** The system must implement Knock API client:

* HTTP client for Knock API requests
* Error handling and retry logic
* Request/response logging
* Rate limit handling

### 7.2 Better Auth Integration

**TR-PHONE-003:** The system must use Better Auth `phoneOTP` plugin:

* Configure `sendOTP` callback to call Knock API
* Configure `verifyOTP` callback to call Knock API
* Store phone number in user's `phoneNumber` field
* Update `phoneNumberVerified` flag on verification

**TR-PHONE-004:** Better Auth configuration:

```typescript
phoneOTP({
  sendOTP: async ({ phoneNumber, code }, ctx) => {
    // Send OTP via Knock API
    await knockClient.sendOTP({ phoneNumber, code });
  },
  verifyOTP: async ({ phoneNumber, code }, ctx) => {
    // Verify OTP via Knock API
    const isValid = await knockClient.verifyOTP({ phoneNumber, code });
    return isValid;
  },
})
```

### 7.3 Environment Variables

**TR-PHONE-005:** The system must use environment variables for Knock configuration:

* `KNOCK_API_KEY` - Knock API key (required)
* `KNOCK_WORKFLOW_KEY` - Knock workflow key for OTP (required)
* `KNOCK_API_URL` - Knock API base URL (optional, defaults to production)
* `OTP_EXPIRY_MINUTES` - OTP expiration time in minutes (default: 10)
* `OTP_LENGTH` - OTP code length (default: 6)

### 7.4 Error Handling

**TR-PHONE-006:** The system must handle various error scenarios:

* **Knock API Errors:**
  * Network errors (retry with exponential backoff)
  * Invalid API key (log error, disable phone auth)
  * Rate limit exceeded (return rate limit error to user)
  * Service unavailable (graceful degradation)

* **OTP Errors:**
  * Invalid OTP code (return error to user)
  * Expired OTP code (return error, allow resend)
  * Too many attempts (invalidate OTP, require new code)

* **Phone Number Errors:**
  * Invalid format (return validation error)
  * Already registered (return conflict error)
  * Not registered (return not found error)

### 7.5 Performance Requirements

**TR-PHONE-007:** OTP send must complete within 5 seconds:

* Knock API request: < 2 seconds
* SMS delivery: < 3 seconds (asynchronous, non-blocking)
* User feedback: Immediate (optimistic UI)

**TR-PHONE-008:** OTP verification must complete within 2 seconds:

* Knock API request: < 1 second
* Database update: < 1 second
* User feedback: Immediate

**TR-PHONE-009:** The system must handle concurrent OTP requests:

* Support multiple simultaneous OTP requests
* Rate limiting prevents abuse
* Database and API can handle concurrent requests

### 7.6 Security Requirements

**TR-PHONE-010:** OTP codes must be secure:

* Cryptographically random generation
* Not stored in plain text (hashed or encrypted)
* Single-use (invalidated after verification)
* Time-limited (expire after configured time)

**TR-PHONE-011:** Phone numbers must be protected:

* Encrypted at rest
* Masked in UI and logs
* Access controlled (only user and admins)
* Compliant with data protection regulations

**TR-PHONE-012:** Rate limiting must be implemented:

* Per phone number rate limits
* Per IP address rate limits
* Distributed rate limiting (if multiple servers)
* Rate limit violations logged

***

## 8. Implementation Phases

### Phase 1: Basic Phone Authentication (MVP)

* Knock API integration
* OTP send and verify via Knock
* Sign up with phone number
* Sign in with phone number
* Basic error handling

### Phase 2: Enhanced Features

* Phone number verification in account settings
* Phone number update functionality
* Account linking (phone + email)
* Rate limiting
* Enhanced error handling

### Phase 3: Advanced Features

* Multi-language SMS support
* SMS delivery status tracking
* Advanced monitoring and analytics
* Security enhancements
* Performance optimizations

***

## 9. Testing Requirements

### 9.1 Unit Tests

* OTP code generation
* Phone number validation and normalization
* Rate limiting logic
* Error handling

### 9.2 Integration Tests

* Knock API integration
* Better Auth phoneOTP plugin integration
* OTP send and verify flow
* Account creation and sign in

### 9.3 End-to-End Tests

* Complete sign up flow (phone number → OTP → account creation)
* Complete sign in flow (phone number → OTP → session creation)
* Phone number update flow
* Account linking flow

### 9.4 Security Tests

* Rate limiting enforcement
* OTP brute force prevention
* Phone number uniqueness validation
* Error message security (no information leakage)

***

## 10. Dependencies

### 10.1 External Services

* **Knock** - SMS/OTP delivery service
  * API access required
  * Account setup required
  * API keys required

### 10.2 Internal Systems

* **Better Auth** - Authentication framework
  * `phoneOTP` plugin required
  * User model with `phoneNumber` and `phoneNumberVerified` fields
  * Session management

* **Database** - User data storage
  * User table with phone number fields
  * Audit log table (optional)

### 10.3 Libraries

* Knock SDK or HTTP client for API calls
* Phone number validation library (e.g., `libphonenumber-js`)
* Encryption library for phone number storage

***

## 11. Acceptance Criteria

### 11.1 Core Functionality

* ✅ Users can sign up with phone number
* ✅ Users can sign in with phone number
* ✅ OTP codes are sent via Knock SMS
* ✅ OTP codes are verified via Knock API
* ✅ Phone numbers are stored and verified
* ✅ Account linking works (phone + email)

### 11.2 Security

* ✅ Rate limiting is enforced
* ✅ OTP codes are secure (random, single-use, time-limited)
* ✅ Phone numbers are encrypted at rest
* ✅ Failed attempts are logged

### 11.3 User Experience

* ✅ UI is mobile-optimized
* ✅ Error messages are clear and actionable
* ✅ OTP verification flow is intuitive
* ✅ Phone number management in account settings works

### 11.4 Integration

* ✅ Knock API integration works
* ✅ Better Auth integration works
* ✅ Multiple authentication methods work together
* ✅ Session management works correctly

***

## 12. Glossary

* **OTP**: One-Time Password - A temporary code sent via SMS for verification
* **E.164**: International phone number format (e.g., +886912345678)
* **Knock**: SMS/OTP delivery service provider
* **Phone Number Verification**: Process of confirming phone number ownership via OTP
* **Account Linking**: Associating multiple authentication methods with one user account
* **Rate Limiting**: Restricting number of requests per time period to prevent abuse

***

## 13. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.1 | 2025-01-27 | System | Combined sign-in and sign-up into single unified flow. Users no longer need to know if they're registered. System automatically creates account if new, signs in if existing. Removed separate error messages for "already registered" and "not registered" during authentication. |
| 1.0 | 2025-01-27 | System | Initial functional requirements document for phone login with Knock |

***

## End of Document
