# Technical Requirements: Phone Login with Twilio

**Date:** 2025-01-27  
**Status:** Active  
**Version:** 1.2  
**Last Updated:** 2025-01-28

**Related Documents:**

* [PHONE-LOGIN-KNOCK.md](./PHONE-LOGIN-KNOCK.md) - Functional Requirements
* [SECURITY.md](../SECURITY.md)
* [ENVIRONMENT_VARIABLES.md](../ENVIRONMENT_VARIABLES.md)

***

## 1. Overview

This document specifies the technical architecture, implementation patterns, and technical constraints for phone number-based authentication using Twilio as the SMS/OTP provider. It complements the Functional Requirements document by providing technical implementation details.

The phone authentication system integrates with Better Auth's `phoneNumber` plugin and uses Twilio's API for SMS delivery. OTP codes are generated and verified locally using database storage.

***

## 2. Architecture

### 2.1 Technology Stack

* **Framework:** Next.js 15 (App Router)
* **Language:** TypeScript
* **Database:** PostgreSQL (via Prisma ORM)
* **Authentication:** Better Auth with `phoneNumber` plugin
* **SMS/OTP Provider:** Twilio (<https://www.twilio.com>)
* **Twilio SDK:** `twilio`
* **Validation:** Zod v4
* **State Management:** React Server Components (default), Client Components with local state
* **Data Fetching:** SWR (client-side), Server Components (server-side)
* **UI Framework:** React 19, Tailwind CSS v4, shadcn/ui, Radix UI
* **Icons:** @tabler/icons-react
* **Package Manager:** Bun
* **Phone Number Validation:** `libphonenumber-js` (recommended)

### 2.2 Application Architecture

#### 2.2.1 Server Actions Pattern

All phone authentication-related data mutations use Next.js Server Actions with `next-safe-action` wrapper:

```typescript
// Pattern: actions/auth/phone/[action-name].ts
export const [actionName]Action = [actionClient]
  .metadata({ name: "[actionName]" })
  .schema([validationSchema])
  .action(async ({ parsedInput, ctx }) => {
    // Implementation
  });
```

**Action Client Types:**

* `baseClient` - For public/unauthenticated actions (e.g., send OTP, verify OTP for sign up/sign in)
* `userRequiredActionClient` - For authenticated user actions (e.g., link phone number, update phone number)
* `adminActionClient` - For system admin actions (e.g., view authentication logs)

#### 2.2.2 Component Architecture

* **Server Components (default):** Account settings pages, authentication pages (initial render)
* **Client Components:** Phone input forms, OTP verification forms, authentication flows
* **Pattern:** Server page → Client component → Server actions → Twilio API

#### 2.2.3 Authentication Flow Architecture

1. **OTP Request:** Client component calls server action → Server action calls Twilio API → OTP sent via SMS → OTP stored in database
2. **OTP Verification:** Client component calls server action → Server action verifies against database → Better Auth creates session
3. **State Updates:** Client components update local state after successful authentication

#### 2.2.4 Twilio Integration Architecture

```txt
┌─────────────┐
│   Client    │
│  Component  │
└──────┬──────┘
       │
       │ Server Action
       ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Better    │─────▶│   Twilio    │─────▶│     SMS     │
│    Auth     │      │     API     │      │   Delivery  │
└─────────────┘      └─────────────┘      └─────────────┘
       │                      │
       │                      │ Store OTP
       │                      ▼
       │              ┌─────────────┐
       │              │  Database   │
       │              │  (Prisma)   │
       │              └─────────────┘
       │
       │ Session Creation
       ▼
┌─────────────┐
│  Database   │
│  (Prisma)   │
└─────────────┘
```

***

## 3. Database Schema

### 3.1 User Model

The `User` model already includes phone number fields:

```prisma
model User {
  id                    String   @id @default(cuid())
  phoneNumber           String?  // E.164 format (e.g., +886912345678)
  phoneNumberVerified   Boolean? @default(false)
  // ... other fields
}
```

**Field Specifications:**

* `phoneNumber` (String, optional):
  * Format: E.164 international format (e.g., `+886912345678`)
  * Stored in normalized format (no spaces, dashes, or parentheses)
  * Indexed for fast lookup
  * Unique constraint (one phone number per user)
  * Encrypted at rest (if encryption is enabled)

* `phoneNumberVerified` (Boolean, default: false):
  * Indicates whether phone number has been verified via OTP
  * Set to `true` after successful OTP verification
  * Set to `false` when phone number is updated (until new number is verified)

### 3.2 OTP Storage (Temporary)

OTP codes are **NOT stored in the database**. Instead:

* **OTP lifecycle:**
  * OTP codes are generated locally
  * OTP codes are stored temporarily in database
  * OTP codes are verified against database
  * OTP codes expire automatically (default: 10 minutes)

* **Local tracking (optional, in-memory cache):**
  * Can use Redis or in-memory cache to track OTP send attempts
  * Used for rate limiting per phone number
  * Rate limiting is implemented in application code

### 3.3 Audit Log Model (Optional)

For security and compliance, consider adding an audit log model:

```prisma
model PhoneAuthAuditLog {
  id              String   @id @default(cuid())
  eventType       String   // "OTP_SEND", "OTP_VERIFY", "SIGN_UP", "SIGN_IN", "PHONE_UPDATE"
  userId          String?   // Null for sign up attempts
  phoneNumber     String   // Masked: +886****5678
  ipAddress       String?
  userAgent       String?
  success         Boolean
  errorMessage    String?
  metadata        String?  // JSON string for additional data
  createdAt       BigInt   // Epoch milliseconds
  
  @@index([userId])
  @@index([phoneNumber])
  @@index([createdAt])
  @@index([eventType])
  @@map("phone_auth_audit_log")
}
```

**Note:** This is optional and can be added in Phase 2 or Phase 3 of implementation.

***

## 4. Twilio API Integration

### 4.1 Twilio SDK Setup

**Installation:**

```bash
bun add twilio
```

**Environment Variables:**

```env
# Twilio API Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx # Twilio Account SID (required)
TWILIO_AUTH_TOKEN=your_auth_token_here # Twilio Auth Token (required)
TWILIO_PHONE_NUMBER=+1234567890 # Twilio phone number for sending SMS (required, E.164 format)
```

### 4.2 Twilio Client Initialization

**File:** `src/lib/twilio/client.ts`

```typescript
import twilio from "twilio";

if (!process.env.TWILIO_ACCOUNT_SID) {
  throw new Error("TWILIO_ACCOUNT_SID environment variable is required");
}

if (!process.env.TWILIO_AUTH_TOKEN) {
  throw new Error("TWILIO_AUTH_TOKEN environment variable is required");
}

export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);
```

### 4.3 Twilio Phone Number Setup

**Twilio Account Setup:**

#### Step 1: Create Twilio Account

1. Sign up for a Twilio account at <https://www.twilio.com/try-twilio>
2. Verify your email address and phone number
3. Complete account setup

#### Step 2: Get Twilio Credentials

1. Log in to your Twilio Console at <https://console.twilio.com>
2. Navigate to **Account** → **API Keys & Tokens**
3. Copy your **Account SID** and **Auth Token**
4. Add them to your `.env` file:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
```

#### Step 3: Get Twilio Phone Number

1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Buy a number**
2. Select a phone number with SMS capabilities
3. Purchase the number (or use a trial number for testing)
4. Copy the phone number in E.164 format (e.g., `+1234567890`)
5. Add it to your `.env` file:

```env
TWILIO_PHONE_NUMBER=+1234567890
```

#### Step 4: Test SMS Delivery

1. Use Twilio Console's **Messaging** → **Try it out** → **Send an SMS** to test
2. Or use the Twilio API directly to send a test message
3. Verify you receive the SMS

**SMS Message Format:**

The OTP message is sent directly via Twilio API with the following format:

```
Your verification code is: {otpCode}. This code will expire in 10 minutes.
```

**Multi-language Support:**

For multi-language support, you can:

1. Detect user's language preference
2. Format the message accordingly in code before sending
3. Example messages:

**English:**

```
Your verification code is: 123456. This code will expire in 10 minutes.
```

**Traditional Chinese:**

```
您的驗證碼是：123456。此驗證碼將在 10 分鐘後過期。
```

**Simplified Chinese:**

```
您的验证码是：123456。此验证码将在 10 分钟后过期。
```

### 4.4 Send OTP Implementation

**File:** `src/lib/otp/send-otp.ts`

```typescript
"use server";

import { generateOTPCode, maskPhoneNumber } from "@/utils/utils";
import { twilioClient } from "@/lib/twilio/client";
import logger from "@/lib/logger";
import { getT } from "@/app/i18n";

export interface SendOTPParams {
  phoneNumber: string; // E.164 format
  userId?: string; // Optional, for existing users
  locale?: string; // Optional locale for i18n (e.g., "en", "tw", "jp")
  code?: string; // Optional OTP code (if not provided, will be generated)
}

export interface SendOTPResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendOTP({
  phoneNumber,
  userId,
  locale,
  code: providedCode,
}: SendOTPParams): Promise<SendOTPResult> {
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!twilioPhoneNumber) {
    const errorMessage = "TWILIO_PHONE_NUMBER environment variable is required";
    logger.error("Twilio configuration missing", {
      metadata: {
        phoneNumber: maskPhoneNumber(phoneNumber),
        userId,
        error: errorMessage,
      },
      tags: ["twilio", "otp", "error"],
    });
    return {
      success: false,
      error: errorMessage,
    };
  }

  try {
    // Use provided code or generate a new one
    const otpCode = providedCode || generateOTPCode();

    // Note: When called from Better Auth's sendOTP callback, Better Auth
    // already stores the OTP in its own system. We just need to send it via SMS.

    // Get translation function for SMS message
    const { t } = await getT(locale || "tw");

    // Get localized SMS message
    const smsMessage = t("otp_sms_message", { code: otpCode });

    // Send OTP via Twilio SMS
    const message = await twilioClient.messages.create({
      body: smsMessage,
      from: twilioPhoneNumber,
      to: phoneNumber,
    });

    logger.info("OTP sent via Twilio", {
      metadata: {
        phoneNumber: maskPhoneNumber(phoneNumber),
        smsMessage,
        userId,
        locale,
        messageSid: message.sid,
      },
      tags: ["twilio", "otp", "send"],
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error) {
    logger.error("Failed to send OTP via Twilio", {
      metadata: {
        phoneNumber: maskPhoneNumber(phoneNumber),
        userId,
        error: error instanceof Error ? error.message : String(error),
        locale,
      },
      tags: ["twilio", "otp", "error"],
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send OTP",
    };
  }
}
```

**Important:** OTP codes are:

1. Generated by Better Auth (or locally if not provided)
2. Stored in Better Auth's system (not our database)
3. Verified by Better Auth's internal verification system
4. SMS messages are internationalized using i18n

### 4.5 OTP Storage Setup

**Better Auth handles OTP storage internally.** We no longer need a custom database model for OTP storage.

**How it works:**

1. When `auth.api.sendPhoneNumberOTP()` is called, Better Auth:
   * Generates the OTP code
   * Stores it in its own system (with expiration)
   * Calls our `sendOTP` callback to send via Twilio

2. When `auth.api.verifyPhoneNumber()` is called, Better Auth:
   * Verifies the OTP against its own storage
   * Checks expiration and attempt limits
   * Creates a session if verification succeeds

**No custom database storage needed** - Better Auth manages the entire OTP lifecycle.

### 4.6 Verify OTP Implementation

**File:** `src/lib/otp/verify-otp.ts`

**Note:** This function is server-only and should NOT be imported by client components. Client components should use server actions (e.g., `signInOrUpPhoneAction`) instead.

```typescript
"use server";

import logger from "@/lib/logger";
import { maskPhoneNumber } from "@/utils/utils";
import { auth } from "../auth";
import { headers } from "next/headers";

export interface VerifyOTPParams {
  phoneNumber: string; // E.164 format
  code: string; // 6-digit OTP code
}

export interface VerifyOTPResult {
  valid: boolean;
  error?: string;
}

export async function verifyOTP({
  phoneNumber,
  code,
}: VerifyOTPParams): Promise<VerifyOTPResult> {
  try {
    const headersList = await headers();

    // Use Better Auth's verifyPhoneNumber API directly
    const result = await auth.api.verifyPhoneNumber({
      body: {
        phoneNumber: phoneNumber, // required
        code: code, // required
        disableSession: false, // Let Better Auth create session
        updatePhoneNumber: true, // Let Better Auth update phone number if session exists
      },
      headers: headersList,
    });

    // Check if verification was successful
    // Better Auth returns: { status: boolean, token: string | null, user: UserWithPhoneNumber }
    if (!result.status || !result.token) {
      logger.warn("OTP verification failed", {
        metadata: {
          phoneNumber: maskPhoneNumber(phoneNumber),
          codeLength: code.length,
          status: result.status,
          hasToken: !!result.token,
        },
        tags: ["otp", "verify", "failed"],
      });

      return {
        valid: false,
        error: "Invalid or expired OTP code. Please request a new code.",
      };
    }

    logger.info("OTP verification successful (Better Auth)", {
      metadata: {
        phoneNumber: maskPhoneNumber(phoneNumber),
      },
      tags: ["otp", "verify", "success", "better-auth"],
    });

    return {
      valid: true,
    };
  } catch (error) {
    logger.error("Failed to verify OTP (Better Auth)", {
      metadata: {
        phoneNumber: maskPhoneNumber(phoneNumber),
        error: error instanceof Error ? error.message : String(error),
      },
      tags: ["otp", "error", "better-auth"],
    });

    return {
      valid: false,
      error: error instanceof Error ? error.message : "Failed to verify OTP",
    };
  }
}
```

**Important:**

* Better Auth handles OTP verification internally
* This function is a wrapper around Better Auth's API
* **Client components should NOT import this function directly** - use server actions instead

### 4.6 Error Handling

**Twilio API Error Types:**

* **Network Errors:** Retry with exponential backoff
* **Invalid Credentials:** Log error, disable phone auth
* **Rate Limit Exceeded:** Return rate limit error to user
* **Service Unavailable:** Graceful degradation
* **Invalid Phone Number:** Return validation error

**Error Handling Pattern:**

```typescript
import { knockClient } from "./client";
import logger from "@/lib/logger";

async function handleKnockError(error: unknown): Promise<string> {
  if (error instanceof Error) {
    // Check for specific Knock error types
    if (error.message.includes("rate limit")) {
      return "Too many requests. Please try again later.";
    }
    if (error.message.includes("invalid phone")) {
      return "Invalid phone number format.";
    }
    if (error.message.includes("unauthorized")) {
      logger.error("Twilio credentials invalid", { metadata: { error: error.message } });
      return "SMS service temporarily unavailable. Please try again later.";
    }
  }
  
  logger.error("Twilio API error", {
    metadata: { error: error instanceof Error ? error.message : String(error) },
  });
  
  return "Failed to send SMS. Please try again later.";
}
```

***

## 5. Better Auth Integration

### 5.1 Better Auth Configuration

**File:** `src/lib/auth.ts`

Update the `phoneNumber` plugin configuration:

```typescript
import { phoneNumber } from "better-auth/plugins";

export const auth = betterAuth({
  // ... other configuration
  plugins: [
    // ... other plugins
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }, ctx) => {
        // Better Auth provides the OTP code, we just need to send it via Twilio
        // and store it in our database for verification
        const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
        if (!twilioPhoneNumber) {
          throw new Error(
            "TWILIO_PHONE_NUMBER environment variable is required",
          );
        }

        // Get locale from request context if available
        const locale =
          ctx?.request?.headers
            ?.get("accept-language")
            ?.split(",")[0]
            ?.split("-")[0] || "tw";

        // Call our existing sendOTP function
        const { sendOTP } = await import("./otp/send-otp");
        const result = await sendOTP({ phoneNumber, code, locale });

        if (!result.success) {
          throw new Error(result.error || "Failed to send OTP");
        }
      },
      // No custom verifyOTP callback - Better Auth handles verification internally
      // When auth.api.verifyPhoneNumber is called, Better Auth will verify
      // the OTP against its own storage (created when sendPhoneNumberOTP was called)
      signUpOnVerification: {
        getTempEmail: (phoneNumber) => {
          // Generate temporary email for phone-based sign-up
          return `${phoneNumber.replace(/[^0-9]/g, "")}@phone.riben.life`;
        },
        getTempName: (phoneNumber) => {
          // Use masked phone number as temporary name
          return phoneNumber.replace(
            /(\+\d{1,3})(\d{3})(\d{3})(\d+)/,
            "$1$2***$4",
          );
        },
      },
    }),
    // ... other plugins
  ],
  user: {
    additionalFields: {
      phoneNumber: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      phoneNumberVerified: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
      // ... other fields
    },
  },
});
```

**Key Points:**

* `sendOTP` callback receives the OTP `code` from Better Auth
* Better Auth stores the OTP in its own system
* `signUpOnVerification` automatically creates users if they don't exist
* No custom `verifyOTP` callback needed - Better Auth handles it internally

### 5.2 Better Auth Phone Authentication Methods

Better Auth's `phoneNumber` plugin provides HTTP endpoints for phone authentication. Server actions use these endpoints via HTTP requests:

* `/api/auth/phone/sign-up` - Sign up with phone number (POST)
* `/api/auth/phone/sign-in` - Sign in with phone number (POST)

**Note:** The server actions (`signInPhoneAction`, `signUpPhoneAction`) automatically handle both sign-up and sign-in. If a user doesn't exist, the system signs them up first, then signs them in. If the user exists, it just signs them in.

**Server Action Usage:**

```typescript
"use server";

// Combined sign-in/sign-up action
import { signInPhoneAction } from "@/actions/auth/phone/sign-in-phone";

// This action works for both new and existing users
const result = await signInPhoneAction({
  phoneNumber: "+886912345678",
  code: "123456",
});

if (result?.data) {
  const { isNewUser, user, session } = result.data;
  // isNewUser indicates if account was just created
}
```

**Client-side Usage (Better Auth Client):**

```typescript
"use client";

import { authClient } from "@/lib/auth-client";

// Send OTP
const { data, error } = await authClient.signInPhone.sendOTP({
  phoneNumber: "+886912345678",
});

// Verify OTP and authenticate (sign up if new, sign in if existing)
const { data: session, error: verifyError } = await authClient.signInPhone.verifyOTP({
  phoneNumber: "+886912345678",
  code: "123456",
});
```

### 5.3 Account Linking

Better Auth supports account linking for users with multiple authentication methods:

* Users can link phone number to existing email account
* Users can link email to existing phone account
* Account linking follows Better Auth's `accountLinking` configuration

**Configuration:**

```typescript
export const auth = betterAuth({
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: true,
      trustedProviders: ["google", "line", "apple", "phone"],
    },
  },
  // ... other configuration
});
```

***

## 6. Server Actions

### 6.1 Send OTP Action

**File:** `src/actions/auth/phone/send-otp.ts`

```typescript
"use server";

import { z } from "zod";
import { baseClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { normalizePhoneNumber, validatePhoneNumber } from "@/utils/phone-utils";
import { headers } from "next/headers";
import logger from "@/lib/logger";

const sendOTPSchema = z.object({
  phoneNumber: z.string().min(1, "Phone number is required"),
});

export const sendOTPAction = baseClient
  .metadata({ name: "sendOTP" })
  .schema(sendOTPSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { phoneNumber } = parsedInput;

    // Normalize phone number to E.164 format
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Validate phone number format
    const isValid = validatePhoneNumber(normalizedPhone);
    if (!isValid) {
      return {
        serverError:
          "Invalid phone number format. Please use international format (e.g., +886912345678).",
      };
    }

    const headersList = await headers();

    try {
      // Use Better Auth's sendPhoneNumberOTP API
      // This will:
      // 1. Generate the OTP code
      // 2. Store it in Better Auth's system
      // 3. Call our sendOTP callback (configured in auth.ts) to send via Twilio
      const result = await auth.api.sendPhoneNumberOTP({
        body: {
          phoneNumber: normalizedPhone,
        },
        headers: headersList,
      });

      // Check if OTP was sent successfully
      if (!result || (result as any).error) {
        logger.error("Better Auth sendPhoneNumberOTP failed", {
          metadata: {
            phoneNumber: normalizedPhone.replace(/\d{4}$/, "****"),
            result: result ? JSON.stringify(result) : "null",
          },
          tags: ["auth", "phone-otp", "error"],
        });

        return {
          serverError: "Failed to send OTP. Please try again later.",
        };
      }

      return {
        data: {
          success: true,
          message: "OTP code sent successfully.",
        },
      };
    } catch (error) {
      logger.error("Send OTP failed", {
        metadata: {
          phoneNumber: normalizedPhone.replace(/\d{4}$/, "****"),
          error: error instanceof Error ? error.message : String(error),
        },
        tags: ["auth", "phone-otp", "error"],
      });

      return {
        serverError:
          error instanceof Error
            ? error.message
            : "Failed to send OTP. Please try again later.",
      };
    }
  });
```

**Key Points:**

* Uses Better Auth's `sendPhoneNumberOTP` API instead of calling `sendOTP` directly
* Better Auth handles OTP generation and storage
* Our `sendOTP` callback (configured in `auth.ts`) is called by Better Auth to send via Twilio
* Rate limiting is handled by Better Auth (if configured)

### 6.2 Combined Sign In/Sign Up Action

**File:** `src/actions/auth/phone/sign-in-or-up-phone.ts`

**Note:** This is the primary action. The system automatically handles both sign-up and sign-in using Better Auth's `signUpOnVerification` feature.

```typescript
"use server";

import { z } from "zod";
import { baseClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { normalizePhoneNumber, validatePhoneNumber } from "@/utils/phone-utils";
import { sqlClient } from "@/lib/prismadb";
import { headers } from "next/headers";
import logger from "@/lib/logger";

const signInOrUpPhoneSchema = z.object({
  phoneNumber: z.string().min(1, "Phone number is required"),
  code: z.string().length(6, "OTP code must be 6 digits"),
});

export const signInOrUpPhoneAction = baseClient
  .metadata({ name: "signInOrUpPhone" })
  .schema(signInOrUpPhoneSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { phoneNumber, code } = parsedInput;

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Validate phone number format
    const isValid = validatePhoneNumber(normalizedPhone);
    if (!isValid) {
      return {
        serverError: "Invalid phone number format.",
      };
    }

    const headersList = await headers();

    try {
      // Check if user exists before verification (to determine if it's a new user)
      const existingUser = await sqlClient.user.findFirst({
        where: { phoneNumber: normalizedPhone },
      });

      // Use Better Auth's HTTP endpoint for phone verification
      // signUpOnVerification might only work with HTTP endpoints, not the internal API
      const baseURL =
        process.env.NEXT_PUBLIC_BASE_URL ||
        (process.env.NODE_ENV === "production"
          ? "https://riben.life"
          : "http://localhost:3001");

      // Better Auth's /api/auth/phone/sign-in endpoint handles both sign-in and sign-up
      // With signUpOnVerification configured, it will automatically create the user if needed
      const verifyResponse = await fetch(`${baseURL}/api/auth/phone/sign-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: headersList.get("cookie") || "",
        },
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          code,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json().catch(() => ({}));
        const errorMessage = errorData.message || "Failed to verify phone number";

        logger.error("Better Auth phone verification failed", {
          metadata: {
            phoneNumber: normalizedPhone.replace(/\d{4}$/, "****"),
            status: verifyResponse.status,
            error: errorMessage,
          },
          tags: ["auth", "phone-otp", "error"],
        });

        return {
          serverError: errorMessage,
        };
      }

      // Get the session after verification
      const session = await auth.api.getSession({
        headers: headersList,
      });

      if (!session?.user) {
        return {
          serverError: "Failed to create session. Please try again.",
        };
      }

      return {
        data: {
          success: true,
          isNewUser: !existingUser,
          user: session.user,
          session: session.session,
        },
      };
    } catch (error) {
      logger.error("Sign in/up with phone failed", {
        metadata: {
          phoneNumber: normalizedPhone.replace(/\d{4}$/, "****"),
          error: error instanceof Error ? error.message : String(error),
        },
        tags: ["auth", "phone-otp", "error"],
      });

      return {
        serverError:
          error instanceof Error
            ? error.message
            : "Failed to authenticate. Please try again.",
      };
    }
  });
```

**Key Features:**

1. **Unified Flow:** Single action handles both sign-up and sign-in
2. **Automatic User Creation:** Better Auth's `signUpOnVerification` automatically creates users if they don't exist
3. **Seamless UX:** Users don't need to know if they're registered or not
4. **Response Flag:** Returns `isNewUser` to indicate if account was just created
5. **HTTP Endpoint:** Uses Better Auth's HTTP endpoint to leverage `signUpOnVerification` feature

### 6.4 Link Phone Number Action

**File:** `src/actions/auth/phone/link-phone.ts`

**Note:** This action should use Better Auth's account linking features. The implementation should verify the OTP using Better Auth's API and then link the phone number to the existing account.

```typescript
"use server";

import { z } from "zod";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { normalizePhoneNumber, validatePhoneNumber } from "@/utils/phone-utils";
import { sqlClient } from "@/lib/prismadb";
import { headers } from "next/headers";
import logger from "@/lib/logger";

const linkPhoneSchema = z.object({
  phoneNumber: z.string().min(1, "Phone number is required"),
  code: z.string().length(6, "OTP code must be 6 digits"),
});

export const linkPhoneAction = userRequiredActionClient
  .metadata({ name: "linkPhone" })
  .schema(linkPhoneSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { phoneNumber, code } = parsedInput;
    const userId = ctx?.userId;
    
    if (!userId) {
      return {
        serverError: "User not authenticated.",
      };
    }
    
    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // Validate phone number format
    const isValid = validatePhoneNumber(normalizedPhone);
    if (!isValid) {
      return {
        serverError: "Invalid phone number format.",
      };
    }
    
    // Check if phone number is already registered to another user
    const existingUser = await sqlClient.user.findFirst({
      where: {
        phoneNumber: normalizedPhone,
        NOT: { id: userId },
      },
    });
    
    if (existingUser) {
      return {
        serverError: "This phone number is already registered to another account.",
      };
    }
    
    const headersList = await headers();
    
    try {
      // Use Better Auth's verifyPhoneNumber API to verify OTP
      const result = await auth.api.verifyPhoneNumber({
        body: {
          phoneNumber: normalizedPhone,
          code,
          disableSession: false,
          updatePhoneNumber: true, // Update phone number if session exists
        },
        headers: headersList,
      });
      
      if (!result.status || !result.token) {
        return {
          serverError: "Invalid OTP code. Please try again.",
        };
      }
      
      // Phone number is now linked and verified via Better Auth
      return {
        data: {
          success: true,
          phoneNumber: normalizedPhone,
          verified: true,
        },
      };
    } catch (error) {
      logger.error("Failed to link phone number", {
        metadata: {
          userId,
          phoneNumber: normalizedPhone.replace(/\d{4}$/, "****"),
          error: error instanceof Error ? error.message : String(error),
        },
        tags: ["auth", "phone-otp", "link", "error"],
      });
      
      return {
        serverError: error instanceof Error ? error.message : "Failed to link phone number.",
      };
    }
  });
```

### 6.5 Update Phone Number Action

**File:** `src/actions/auth/phone/update-phone.ts`

Similar to `linkPhoneAction`, but requires verification of new phone number and optionally notifies old phone number.

***

## 7. Rate Limiting

### 7.1 Rate Limiting Strategy

**Per Phone Number:**

* Maximum 3 OTP requests per 15 minutes
* Maximum 5 OTP requests per hour
* Maximum 10 OTP requests per 24 hours

**Per IP Address:**

* Maximum 10 OTP requests per 15 minutes
* Maximum 20 OTP requests per hour
* Maximum 50 OTP requests per 24 hours

### 7.2 Rate Limiting Implementation

**File:** `src/utils/rate-limit.ts`

```typescript
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";

interface RateLimitCheck {
  phoneNumber?: string;
  ipAddress?: string;
}

interface RateLimitResult {
  allowed: boolean;
  message?: string;
  retryAfter?: number; // seconds
}

// In-memory cache for rate limiting (or use Redis in production)
const rateLimitCache = new Map<string, number[]>();

export async function checkRateLimit({
  phoneNumber,
  ipAddress,
}: RateLimitCheck): Promise<RateLimitResult> {
  const now = Date.now();
  const windows = [
    { duration: 15 * 60 * 1000, max: 3 }, // 15 minutes, 3 requests
    { duration: 60 * 60 * 1000, max: 5 }, // 1 hour, 5 requests
    { duration: 24 * 60 * 60 * 1000, max: 10 }, // 24 hours, 10 requests
  ];
  
  // Check phone number rate limit
  if (phoneNumber) {
    const phoneKey = `phone:${phoneNumber}`;
    const phoneRequests = rateLimitCache.get(phoneKey) || [];
    
    for (const window of windows) {
      const recentRequests = phoneRequests.filter(
        (timestamp) => now - timestamp < window.duration
      );
      
      if (recentRequests.length >= window.max) {
        const oldestRequest = Math.min(...recentRequests);
        const retryAfter = Math.ceil((oldestRequest + window.duration - now) / 1000);
        
        logger.warn("Phone number rate limit exceeded", {
          metadata: {
            phoneNumber: maskPhoneNumber(phoneNumber),
            window: `${window.duration}ms`,
            max: window.max,
            current: recentRequests.length,
          },
          tags: ["rate-limit", "phone"],
        });
        
        return {
          allowed: false,
          message: `Too many requests. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        };
      }
    }
    
    // Add current request
    phoneRequests.push(now);
    rateLimitCache.set(phoneKey, phoneRequests);
    
    // Clean up old entries
    cleanupCache(phoneKey, phoneRequests);
  }
  
  // Check IP address rate limit
  if (ipAddress) {
    const ipKey = `ip:${ipAddress}`;
    const ipRequests = rateLimitCache.get(ipKey) || [];
    const ipWindows = [
      { duration: 15 * 60 * 1000, max: 10 },
      { duration: 60 * 60 * 1000, max: 20 },
      { duration: 24 * 60 * 60 * 1000, max: 50 },
    ];
    
    for (const window of ipWindows) {
      const recentRequests = ipRequests.filter(
        (timestamp) => now - timestamp < window.duration
      );
      
      if (recentRequests.length >= window.max) {
        const oldestRequest = Math.min(...recentRequests);
        const retryAfter = Math.ceil((oldestRequest + window.duration - now) / 1000);
        
        logger.warn("IP address rate limit exceeded", {
          metadata: {
            ipAddress,
            window: `${window.duration}ms`,
            max: window.max,
            current: recentRequests.length,
          },
          tags: ["rate-limit", "ip"],
        });
        
        return {
          allowed: false,
          message: `Too many requests. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        };
      }
    }
    
    // Add current request
    ipRequests.push(now);
    rateLimitCache.set(ipKey, ipRequests);
    
    // Clean up old entries
    cleanupCache(ipKey, ipRequests);
  }
  
  return { allowed: true };
}

function cleanupCache(key: string, requests: number[]): void {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  const filtered = requests.filter((timestamp) => now - timestamp < maxAge);
  
  if (filtered.length === 0) {
    rateLimitCache.delete(key);
  } else {
    rateLimitCache.set(key, filtered);
  }
}

function maskPhoneNumber(phoneNumber: string): string {
  if (phoneNumber.length <= 4) return "****";
  return phoneNumber.slice(0, -4) + "****";
}
```

**Note:** For production, consider using Redis for distributed rate limiting across multiple servers.

***

## 8. Phone Number Validation

### 8.1 Phone Number Utilities

**File:** `src/utils/phone-utils.ts`

```typescript
import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js";

/**
 * Normalize phone number to E.164 format
 * @param phoneNumber - Phone number in any format
 * @returns Normalized phone number in E.164 format (e.g., +886912345678)
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  try {
    // Remove spaces, dashes, parentheses
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, "");
    
    // Parse and normalize to E.164
    const parsed = parsePhoneNumber(cleaned);
    return parsed.number; // Returns E.164 format (e.g., +886912345678)
  } catch (error) {
    // If parsing fails, try to add + prefix if missing
    if (!phoneNumber.startsWith("+")) {
      return `+${phoneNumber}`;
    }
    return phoneNumber;
  }
}

/**
 * Validate phone number format
 * @param phoneNumber - Phone number in E.164 format
 * @returns true if valid, false otherwise
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  try {
    return isValidPhoneNumber(phoneNumber);
  } catch (error) {
    return false;
  }
}

/**
 * Format phone number for display (user-friendly format)
 * @param phoneNumber - Phone number in E.164 format
 * @returns Formatted phone number (e.g., +886 912 345 678)
 */
export function formatPhoneNumber(phoneNumber: string): string {
  try {
    const parsed = parsePhoneNumber(phoneNumber);
    return parsed.formatInternational(); // Returns +886 912 345 678
  } catch (error) {
    return phoneNumber;
  }
}

/**
 * Mask phone number for privacy (e.g., +886****5678)
 * @param phoneNumber - Phone number in E.164 format
 * @returns Masked phone number
 */
export function maskPhoneNumber(phoneNumber: string): string {
  if (phoneNumber.length <= 4) return "****";
  return phoneNumber.slice(0, -4) + "****";
}
```

**Installation:**

```bash
bun add libphonenumber-js
```

***

## 9. Error Handling

### 9.1 Error Types

**Validation Errors:**

* Invalid phone number format
* Phone number already registered
* Phone number not registered
* Invalid OTP code
* OTP code expired

**Rate Limiting Errors:**

* Too many OTP requests
* Rate limit exceeded

**Twilio API Errors:**

* Network errors
* Invalid API key
* Service unavailable
* SMS delivery failure

**Better Auth Errors:**

* Account creation failure
* Session creation failure
* Account linking failure

### 9.2 Error Handling Pattern

All server actions return:

```typescript
{
  data?: T;           // Success data
  serverError?: string; // Error message
  validationErrors?: {  // Validation errors
    [field: string]: string[];
  };
}
```

**Client-side Error Handling:**

```typescript
"use client";

const result = await sendOTPAction({ phoneNumber });

if (result?.serverError) {
  toastError({ description: result.serverError });
  return;
}

if (result?.validationErrors) {
  // Handle validation errors
  Object.entries(result.validationErrors).forEach(([field, errors]) => {
    form.setError(field, { message: errors[0] });
  });
  return;
}

// Success
toastSuccess({ description: "OTP sent successfully!" });
```

***

## 10. Security Requirements

### 10.1 OTP Security

* **OTP Generation:** Cryptographically random, 6 digits
* **OTP Storage:** Stored in database with expiration
* **OTP Expiration:** 10 minutes (configurable)
* **OTP Single-Use:** Invalidated after successful verification
* **OTP Attempt Limits:** Maximum 5 attempts per code

### 10.2 Phone Number Security

* **Encryption at Rest:** Phone numbers encrypted in database (if encryption enabled)
* **Masking in UI:** Phone numbers masked in UI and logs (e.g., +886****5678)
* **Access Control:** Only user and admins can view phone numbers
* **Data Protection:** Compliant with GDPR, CCPA, and other regulations

### 10.3 Rate Limiting Security

* **Per Phone Number:** Prevents abuse of OTP requests
* **Per IP Address:** Prevents distributed attacks
* **Violation Logging:** All rate limit violations logged
* **Account Lockout:** Optional account lockout after repeated failures

### 10.4 API Security

* **API Credentials Protection:** Twilio Account SID and Auth Token stored in environment variables
* **HTTPS Only:** All API requests over HTTPS
* **Input Validation:** All inputs validated with Zod schemas
* **SQL Injection Prevention:** Prisma ORM with parameterized queries

***

## 11. Performance Requirements

### 11.1 Response Times

* **OTP Send:** < 5 seconds (Knock API: < 2s, SMS delivery: < 3s)
* **OTP Verify:** < 2 seconds (Knock API: < 1s, Database: < 1s)
* **Sign Up/Sign In:** < 3 seconds (including OTP verification)
* **Phone Number Update:** < 3 seconds

### 11.2 Database Optimization

* **Indexes:** `phoneNumber` field indexed for fast lookup
* **Query Optimization:** Use `select` to limit returned fields
* **Connection Pooling:** Prisma connection pooling enabled

### 11.3 Caching

* **Rate Limit Cache:** In-memory cache (or Redis for production)
* **Phone Number Lookup:** Optional caching for frequently accessed phone numbers

***

## 12. Implementation Phases

### Phase 1: Basic Phone Authentication (MVP)

**Tasks:**

1. Install Knock SDK: `bun add @knocklabs/node`
2. Install phone validation library: `bun add libphonenumber-js`
3. Create Knock client (`src/lib/knock/client.ts`)
4. Implement `sendOTP` function (`src/lib/knock/send-otp.ts`)
5. Implement `verifyOTP` function (`src/lib/knock/verify-otp.ts`)
6. Update Better Auth configuration (`src/lib/auth.ts`)
7. Create phone number utilities (`src/utils/phone-utils.ts`)
8. Create server actions:
   * `send-otp.ts`
   * `sign-in-phone.ts` (combined sign-in/sign-up logic)
   * `sign-up-phone.ts` (backward compatibility, uses same logic)
   * `sign-in-or-up-phone.ts` (explicit combined action)
9. Create UI components:
   * Phone input form
   * OTP verification form
   * Sign up/sign in pages
10. Basic error handling
11. Basic rate limiting

**Deliverables:**

* Users can authenticate with phone number (automatic sign-up if new, sign-in if existing)
* Seamless UX - users don't need to know if they're registered
* OTP codes sent via Knock SMS
* OTP codes verified against database storage

### Phase 2: Enhanced Features

**Tasks:**

1. Implement rate limiting (`src/utils/rate-limit.ts`)
2. Create `link-phone.ts` action
3. Create `update-phone.ts` action
4. Add phone number management to account settings
5. Enhanced error handling
6. Audit logging (optional)
7. Account linking UI

**Deliverables:**

* Phone number verification in account settings
* Phone number update functionality
* Account linking (phone + email)
* Rate limiting enforcement
* Enhanced error messages

### Phase 3: Advanced Features

**Tasks:**

1. Multi-language SMS support
2. SMS delivery status tracking
3. Advanced monitoring and analytics
4. Security enhancements
5. Performance optimizations
6. Redis integration for distributed rate limiting
7. Audit log model and logging

**Deliverables:**

* Multi-language SMS
* Delivery status tracking
* Advanced analytics
* Production-ready rate limiting
* Comprehensive audit logging

***

## 13. Testing Requirements

### 13.1 Unit Tests

**Files to Test:**

* `src/lib/knock/send-otp.ts`
* `src/lib/knock/verify-otp.ts`
* `src/utils/phone-utils.ts`
* `src/utils/rate-limit.ts`

**Test Cases:**

* OTP code generation
* Phone number validation and normalization
* Rate limiting logic
* Error handling

### 13.2 Integration Tests

**Files to Test:**

* `src/actions/auth/phone/send-otp.ts`
* `src/actions/auth/phone/sign-in-phone.ts` (combined sign-in/sign-up)
* `src/actions/auth/phone/sign-up-phone.ts` (backward compatibility)
* `src/actions/auth/phone/link-phone.ts`

**Test Cases:**

* Knock API integration
* Better Auth phoneNumber plugin integration
* OTP send and verify flow
* Combined sign-up/sign-in flow (new user)
* Combined sign-up/sign-in flow (existing user)
* Account linking

### 13.3 End-to-End Tests

**Test Flows:**

* Complete authentication flow (phone number → OTP → automatic sign-up or sign-in)
* New user flow (phone number → OTP → account creation → sign in)
* Existing user flow (phone number → OTP → sign in)
* Phone number update flow
* Account linking flow

### 13.4 Security Tests

**Test Cases:**

* Rate limiting enforcement
* OTP brute force prevention
* Phone number uniqueness validation
* Error message security (no information leakage)
* API key protection

***

## 14. Environment Variables

### 14.1 Required Variables

```env
# Twilio API Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx # Twilio Account SID (required)
TWILIO_AUTH_TOKEN=your_auth_token_here # Twilio Auth Token (required)
TWILIO_PHONE_NUMBER=+1234567890 # Twilio phone number for sending SMS (required, E.164 format)
```

### 14.2 Optional Variables

```env
# OTP Configuration
OTP_EXPIRY_MINUTES=10 # OTP expiration time in minutes (default: 10)
OTP_LENGTH=6 # OTP code length (default: 6)
```

### 14.3 Environment-Specific Configuration

**Development:**

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_dev_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**Production:**

```env
TWILIO_ACCOUNT_SID=ACyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
TWILIO_AUTH_TOKEN=your_prod_auth_token
TWILIO_PHONE_NUMBER=+1987654321
```

***

## 15. Dependencies

### 15.1 External Services

* **Twilio** - SMS/OTP delivery service
  * API access required
  * Account setup required
  * Account SID and Auth Token required
  * Phone number with SMS capabilities required

### 15.2 NPM Packages

```json
{
  "dependencies": {
    "twilio": "^5.11.1",
    "libphonenumber-js": "^1.11.0"
  }
}
```

**Installation:**

```bash
bun add twilio libphonenumber-js
```

### 15.3 Internal Dependencies

* **Better Auth** - Authentication framework
  * `phoneNumber` plugin required
  * User model with `phoneNumber` and `phoneNumberVerified` fields
  * Session management

* **Database** - User data storage
  * User table with phone number fields
  * Prisma ORM for database access

***

## 16. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.3 | 2025-01-29 | System | Integrated Better Auth for OTP storage and verification. Removed custom OTP database storage. Updated `sendOTP` to accept optional code from Better Auth. Updated `signInOrUpPhoneAction` to use Better Auth's HTTP endpoint with `signUpOnVerification`. Added i18n support for SMS messages. Updated file locations: `lib/knock/` → `lib/otp/` and `lib/twilio/`. Client components should NOT import `verifyOTP` directly - use server actions instead. |
| 1.2 | 2025-01-28 | System | Replaced Knock with Twilio as SMS/OTP provider. Updated all API integration details, environment variables, and code examples. OTP verification now uses database instead of external API. |
| 1.1 | 2025-01-27 | System | Combined sign-in and sign-up into single unified flow. Updated server actions to automatically handle both new and existing users. Added `isNewUser` flag to response. |
| 1.0 | 2025-01-27 | System | Initial technical requirements document for phone login with Knock |

***

## End of Document
