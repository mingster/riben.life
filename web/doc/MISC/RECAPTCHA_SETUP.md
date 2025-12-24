# ReCAPTCHA Setup Guide

This guide explains how to configure reCAPTCHA verification for the contact form.

## Environment Variables

Add these to your `.env.local` file:

```bash
# Required: Your reCAPTCHA site key (public key)
NEXT_PUBLIC_RECAPTCHA=6Lf94eArAAAAAOL74I82SUUNAXxPSrMcKYBAfeMf

# Required: Your reCAPTCHA secret key (private key) 
# to get the key, click on "Integrate with a third-party service or plugin" link
# in the "Integrating with a third party?" box. 
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key_here

# Optional: Google Cloud Project ID for reCAPTCHA Enterprise
GOOGLE_CLOUD_PROJECT_ID=riben-web

# Optional: Google Cloud Service Account Key (for Enterprise)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Setup Options

### Option 1: Basic reCAPTCHA (Minimum Setup)

**Note:** The contact form uses Enterprise reCAPTCHA on the frontend, but the backend will fall back to basic verification if Enterprise is not configured.

1. Go to [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Create a new site with reCAPTCHA v3
3. Set `NEXT_PUBLIC_RECAPTCHA` to your site key
4. Set `RECAPTCHA_SECRET_KEY` to your secret key

**Important:** Even with a basic site key, the frontend will attempt to use Enterprise API. If your site key is not an Enterprise key, you may see verification errors. For best results, use an Enterprise key (see Option 2).

### Option 2: reCAPTCHA Enterprise (Recommended for Production)

#### Step 1: Set up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing project
3. Enable the **reCAPTCHA Enterprise API**
   - Navigate to APIs & Services > Library
   - Search for "reCAPTCHA Enterprise API"
   - Click Enable

#### Step 2: Create reCAPTCHA Enterprise Key

1. Go to [reCAPTCHA Enterprise](https://console.cloud.google.com/security/recaptcha)
2. Click **Create Key**
3. Configure the key:
   - Display name: `Contact Form`
   - Platform: `Website`
   - Domains: Add your domains (e.g., `riben.life`, `localhost`)
   - reCAPTCHA type: **Score-based** (no challenge)
4. Click **Create**
5. **Important:** Complete any verification steps required by Google Console
   - You may see a message: "您必須先完成 reCAPTCHA 驗證，才能繼續操作"
   - Follow the verification steps in the Google Console
   - This is required before the key can be used
6. Copy the **Site Key** - this is your `NEXT_PUBLIC_RECAPTCHA`

**Note:** The frontend implementation uses Enterprise reCAPTCHA API (`grecaptcha.enterprise.execute()`), so you **must** use an Enterprise key for the contact form to work properly.

#### Step 3: Create Service Account

1. Go to IAM & Admin > Service Accounts
2. Click **Create Service Account**
3. Configure:
   - Name: `recaptcha-verifier`
   - Description: `Service account for reCAPTCHA verification`
4. Grant Role: **reCAPTCHA Enterprise Admin** or **reCAPTCHA Enterprise Agent**
5. Click **Done**
6. Click on the service account
7. Go to **Keys** tab
8. Click **Add Key** > **Create new key**
9. Choose **JSON** format
10. Download the key file

#### Step 4: Configure Environment Variables

```bash
NEXT_PUBLIC_RECAPTCHA=your_site_key_from_step_2
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/downloaded-key.json
```

#### Important Notes

- ⚠️ **The contact form requires an Enterprise key** - it uses `grecaptcha.enterprise.execute()` on the frontend
- ⚠️ The site key from reCAPTCHA Enterprise is different from standard reCAPTCHA
- ⚠️ You must complete verification in Google Console before the key can be used
- ⚠️ The service account needs proper permissions to create assessments
- ⚠️ If verification is not completed, you'll see: "您必須先完成 reCAPTCHA 驗證，才能繼續操作"

## Architecture

### Script Loading Structure

The reCAPTCHA script is loaded at the **root layout level** using Next.js Script component to ensure:

- ✅ **Single Script Load**: One script instance for the entire application
- ✅ **No Duplicate Scripts**: Prevents "reCAPTCHA has already been loaded" errors
- ✅ **Global Access**: All components can use `useRecaptcha()` hook directly
- ✅ **Consistent Configuration**: Enterprise mode configured once at root level
- ✅ **Next.js Optimized**: Uses Next.js Script component for better performance

**Architecture Hierarchy:**

```
Root Layout (src/app/layout.tsx)
  └── RecaptchaScript (useEnterprise={true})
      └── All Application Pages
          ├── ContactForm (uses useRecaptcha() hook)
          ├── FormMagicLink (uses useRecaptcha() hook)
          └── Any other component needing reCAPTCHA
```

**Migration Note:**

Previously, the implementation used a React Context provider pattern which had issues with Next.js hot reload. This has been refactored to use Next.js Script component with a custom hook that directly accesses the grecaptcha API, providing better compatibility with Next.js App Router.

## How It Works

### Flow Diagram

```
1. User fills out contact form
   ↓
2. Frontend: grecaptcha.enterprise.execute("contact_form") → generates token
   (Uses Enterprise API: https://www.google.com/recaptcha/enterprise.js)
   ↓
3. Form submitted with token to API endpoint
   ↓
4. Backend: verifyRecaptcha(token)
   ↓
5a. If Enterprise configured:
    → createAssessment(token, siteKey, projectId)
    → Validate token, action, and score
    → Return success/failure
   ↓
5b. If Enterprise not configured OR fails:
    → Basic verification via siteverify API
    → Return success/failure
   ↓
6. If verified: Send email
   If failed: Return error to user
```

### Frontend Implementation

The application uses **reCAPTCHA Enterprise** on the frontend, following the [official Google Cloud documentation](https://docs.cloud.google.com/recaptcha/docs/instrument-web-pages):

- **Script Location**: `RecaptchaScript` component is configured in the root layout (`src/app/layout.tsx`)
- **Single Script Instance**: One script load for the entire application prevents duplicate script loading
- **Script Loading**: Uses Next.js Script component to load `https://www.google.com/recaptcha/enterprise.js?render=SITE_KEY`
- **Token Generation**: Uses `grecaptcha.enterprise.execute(SITE_KEY, {action: 'contact_form'})`
- **Enterprise Mode**: Script configured with `useEnterprise={true}` at root level
- **Action Name**: `"contact_form"` (validated on backend)
- **Custom Hook**: `useRecaptcha()` hook directly accesses grecaptcha API without provider pattern

**Key Files:**

- `src/app/layout.tsx` - Root layout with `RecaptchaScript` component
- `src/components/recaptcha-script.tsx` - Script loading component using Next.js Script
- `src/hooks/use-recaptcha.ts` - Custom hook that directly uses grecaptcha API
- `src/app/(store)/[storeId]/components/AboutUs.tsx` - Contact form (uses `useRecaptcha()` hook)
- `src/components/auth/form-magic-link.tsx` - Magic link form (uses `useRecaptcha()` hook)

### Assessment Creation (Enterprise)

When using reCAPTCHA Enterprise, the system:

1. **Creates Assessment**: Calls `client.createAssessment()` with:
   - Token from frontend
   - Site key from environment
   - Project path

2. **Validates Token**: Checks if token is:
   - Valid (not expired, not already used)
   - From the correct site key
   - For the expected action (`contact_form`)

3. **Analyzes Risk**: Gets risk score (0.0-1.0):
   - 0.0 = Very likely a bot
   - 1.0 = Very likely a human
   - Threshold: 0.5 (configurable)

4. **Returns Result**: With score, reasons, and success status

### Frontend Implementation Details

The reCAPTCHA script is loaded in the root layout using Next.js Script component, ensuring a single script load across the entire application:

```typescript
// In src/app/layout.tsx (Root Layout)
<body>
  <RecaptchaScript useEnterprise={true} />
  <NextThemeProvider>
    <CookiesProvider>
      <I18nProvider>
        <SessionWrapper>
          {children}  {/* All pages have access to reCAPTCHA */}
        </SessionWrapper>
      </I18nProvider>
    </CookiesProvider>
  </NextThemeProvider>
</body>
```

**Components can use the hook directly:**

```typescript
// In any component (e.g., ContactForm.tsx, FormMagicLink.tsx)
import { useRecaptcha } from "@/hooks/use-recaptcha";

function MyComponent() {
  const { executeRecaptcha, isReady } = useRecaptcha(true);
  
  const handleSubmit = async () => {
    if (!executeRecaptcha || !isReady) {
      // Handle not ready state
      return;
    }
    
    const token = await executeRecaptcha("contact_form");
    // This calls: grecaptcha.enterprise.execute(SITE_KEY, {action: 'contact_form'})
    // Send token to backend for verification
  };
}
```

**What happens:**

1. Root layout loads script: `https://www.google.com/recaptcha/enterprise.js?render=SITE_KEY` via Next.js Script component
2. All components can access `useRecaptcha()` hook which directly uses grecaptcha API
3. Hook monitors script loading state and provides `isReady` flag
4. On submit: Calls `grecaptcha.enterprise.execute()` (not `grecaptcha.execute()`)
5. Token is sent to backend for verification

**Important:**

- The frontend **requires** an Enterprise site key. Using a basic reCAPTCHA key will cause errors.
- The script is loaded once at the root level using Next.js Script component, preventing duplicate script loading errors.
- Components use the custom `useRecaptcha()` hook which works better with Next.js App Router than provider pattern.
- The hook provides `isReady` state to check if reCAPTCHA is loaded before executing.

### Backend Implementation

The assessment creation is handled in `src/lib/recaptcha-verify.ts`, following the [official Google Cloud documentation](https://cloud.google.com/recaptcha/docs/create-assessment-website):

```typescript
// Create the reCAPTCHA Enterprise client
// Note: Cache this client in production to avoid memory issues
const client = new RecaptchaEnterpriseServiceClient();
const projectPath = client.projectPath(projectId);

// Build the assessment request with optional context
const event = {
  token: token,              // From frontend
  siteKey: siteKey,          // Your Enterprise site key
  expectedAction: action,    // Action to validate
  userIpAddress: ipAddress,  // Optional: User's IP
  userAgent: userAgent,      // Optional: User agent
  ja3: ja3Fingerprint,       // Optional: JA3 fingerprint
};

const request = {
  assessment: {
    event: event,
  },
  parent: projectPath,       // projects/your-project-id
};

// Create assessment (this validates the token)
const [response] = await client.createAssessment(request);

// Check results
const isValid = response.tokenProperties?.valid;
const invalidReason = response.tokenProperties?.invalidReason;
const score = response.riskAnalysis?.score || 0;
const reasons = response.riskAnalysis?.reasons || [];
const action = response.tokenProperties.action;
```

**Important Notes from Google:**

- ✅ Always create assessments on your **backend** (never frontend)
- ✅ First 10,000 assessments per month are **free**
- ✅ Include user context (IP, user agent) for better accuracy
- ⚠️ Cache the client to avoid memory issues
- ⚠️ New keys take **48 hours** to provide accurate scores

## Important Security Notes

According to [Google's official documentation](https://cloud.google.com/recaptcha/docs/create-assessment-website):

### 🔒 Backend Validation Required

**Critical:** Always create assessments on your backend, not frontend. This prevents attackers from forging requests and makes your application more secure.

```
✓ Frontend: Generate token only
✓ Backend: Validate token with createAssessment
✗ Never: Validate on frontend
```

### 📊 Pricing

- **Free Tier**: First 10,000 assessments per month
- **Billing**: Required after exceeding free tier
- **Cost**: Pay per assessment after free tier

### ⏱️ New Key Accuracy

When you create a new reCAPTCHA key:

- Initial scores may show `score=0.9` with `reason=LOW_CONFIDENCE`
- **Wait 48 hours** for accurate risk analysis
- reCAPTCHA needs time to learn patterns on your site

### 🎯 User Context for Better Accuracy

Including user context improves risk analysis accuracy:

- `userIpAddress`: User's IP address
- `userAgent`: Browser user agent string
- `ja3`: JA3 TLS fingerprint (advanced)

Our implementation automatically includes IP and user agent from request headers.

## Testing & Verification

### 🧪 Built-in Test Pages

We've created comprehensive test tools to verify your reCAPTCHA setup:

**Option 1: Installation Page** ⭐ (Recommended for first-time setup)

- **URL:** `http://localhost:3000/install-SuF9NTx`
- **Features:**
  - Collapsible reCAPTCHA test widget
  - Integrated with installation tools
  - Quick verification during setup
  - Compact results display
- **Perfect for:** Initial setup and configuration verification

**Option 2: Dedicated Test Page** (For detailed testing)

- **URL:** `http://localhost:3000/install-SuF9NTx/recaptcha`
- **Features:**
  - Full-featured test interface
  - Detailed results with raw responses
  - Side-by-side comparison of methods
  - Comprehensive debugging information
- **Perfect for:** Deep testing and troubleshooting

**What both test:**

- ✅ Token generation on frontend
- ✅ Token validation on backend
- ✅ Configuration status
- ✅ Verification method (Basic vs Enterprise)
- ✅ Risk score analysis
- ✅ User context (IP, user agent)

**How to use:**

1. Start your development server: `bun run dev`
2. Navigate to `/test/recaptcha`
3. Click "Test reCAPTCHA Verification"
4. Review the detailed results

### 📡 API Test Endpoint

You can also test directly via API:

```bash
# Check configuration
curl http://localhost:3000/api/common/recaptcha-verify

# Test verification (need a valid token)
curl -X POST http://localhost:3000/api/common/recaptcha-verify \
  -H "Content-Type: application/json" \
  -d '{"token": "your-recaptcha-token", "action": "test"}'

# Test with specific mode
curl -X POST http://localhost:3000/api/common/recaptcha-verify \
  -H "Content-Type: application/json" \
  -d '{"token": "your-token", "action": "test", "testMode": "enterprise"}'
```

### 🔑 Google Test Keys

For development, you can use Google's official test keys:

**reCAPTCHA v3 Test Keys:**

- Site Key: `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`
- Secret Key: `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`

**Behavior with test keys:**

- Always return `valid=true`
- Always return `score=0.9`
- No actual bot detection
- Use only for development/testing

### 🎯 Interpreting Scores

When testing with real keys:

| Score | Interpretation | Recommended Action |
|-------|---------------|-------------------|
| **0.9 - 1.0** | Very likely human | Allow |
| **0.7 - 0.9** | Likely human | Allow |
| **0.5 - 0.7** | Neutral | Allow with monitoring |
| **0.3 - 0.5** | Suspicious | Additional verification |
| **0.0 - 0.3** | Likely bot | Block or challenge |

**Note:** Default threshold in our implementation is `0.5`

### ⚠️ New Key Considerations

When testing with newly created keys:

- Initial scores may be inaccurate (LOW_CONFIDENCE)
- Wait **48 hours** for accurate results
- reCAPTCHA needs time to learn your site patterns
- Test with multiple submissions to improve accuracy

## Verification Checklist

Use this checklist to verify your reCAPTCHA setup:

### ✅ Frontend Setup

- [ ] `NEXT_PUBLIC_RECAPTCHA` environment variable is set (must be Enterprise key)
- [ ] reCAPTCHA Enterprise script loads: `enterprise.js` (check browser console)
- [ ] `grecaptcha.enterprise.execute` is available (check browser console)
- [ ] Security verification status shows "ready" in forms
- [ ] Token generation works (check test page)
- [ ] No verification errors from Google Console

### ✅ Backend Setup  

- [ ] `RECAPTCHA_SECRET_KEY` environment variable is set
- [ ] API endpoint can verify tokens successfully
- [ ] Logs show correct verification method
- [ ] User context (IP, user agent) is captured

### ✅ Enterprise Setup (Required for Contact Form)

**Frontend (Required):**

- [ ] Site key is an Enterprise key (created in Google Cloud Console)
- [ ] Site key verification completed in Google Console
- [ ] `RecaptchaScript` in root layout (`src/app/layout.tsx`) uses `useEnterprise={true}`
- [ ] Enterprise script loads: `enterprise.js` (not `api.js`)
- [ ] Only one script instance exists (check browser console for duplicate warnings)
- [ ] `useRecaptcha()` hook shows `isReady: true` when script is loaded

**Backend (Optional but Recommended):**

- [ ] `GOOGLE_CLOUD_PROJECT_ID` is set
- [ ] Service account credentials are configured
- [ ] reCAPTCHA Enterprise API is enabled
- [ ] IAM permissions are correct
- [ ] Logs show "Enterprise reCAPTCHA verification successful"
- [ ] If not configured, system falls back to basic verification

### 🧪 Testing Steps

1. **Visit test page:** `/test/recaptcha`
2. **Check status:** Green checkmark for "reCAPTCHA v3 is ready"
3. **Click test button:** Should complete without errors
4. **Verify results:**
   - Success: Shows green "Verification Successful"
   - Score: Between 0.0 and 1.0
   - Configuration: All items show "Configured"
   - Method: Shows "Basic" or "Enterprise"

5. **Check logs:** Should see:

   ```
   [INFO] Verifying reCAPTCHA token
   Using basic reCAPTCHA verification (or) ✓ Enterprise...
   ✓ Basic reCAPTCHA verification successful (or) Enterprise...
   ```

6. **Test contact form:** Submit a contact form and verify:
   - Form submits successfully
   - Email is queued
   - No captcha errors in logs

## Verification Features

- ✅ **Enterprise Frontend**: Uses `grecaptcha.enterprise.execute()` following Google Cloud documentation
- ✅ **Enterprise Backend**: Uses Google Cloud reCAPTCHA Enterprise API for verification
- ✅ **Fallback Support**: Falls back to basic verification if Enterprise unavailable
- ✅ **Action Verification**: Ensures tokens are for the correct action (`contact_form`)
- ✅ **Score Threshold**: Rejects submissions with scores below 0.5
- ✅ **Verification Detection**: Automatically detects when site key needs Google Console verification
- ✅ **Detailed Logging**: Comprehensive error logging and debugging (client and server)
- ✅ **Error Handling**: Graceful handling of network and API errors with helpful messages
- ✅ **Test Tools**: Built-in test page and API endpoint for verification

## Files in This Implementation

### Core Files

- `src/app/layout.tsx` - Root layout with `RecaptchaScript` component
- `src/components/recaptcha-script.tsx` - Script loading component using Next.js Script
- `src/hooks/use-recaptcha.ts` - Custom hook that directly uses grecaptcha API
- `src/lib/recaptcha-verify.ts` - Verification utility with Enterprise support
- `src/app/api/common/contact-us-mail/route.ts` - Contact form API endpoint
- `src/app/api/common/recaptcha-verify/route.ts` - Test/verification API endpoint
- `src/app/(store)/[storeId]/components/AboutUs.tsx` - Contact form component (uses `useRecaptcha()` hook)
- `src/components/auth/form-magic-link.tsx` - Magic link form (uses `useRecaptcha()` hook)

### Installation & Testing

- `src/app/install-SuF9NTx/recaptcha-test-widget.tsx` - Reusable test widget
- `src/app/install-SuF9NTx/client-install.tsx` - Installation page (includes test widget)
- `src/app/install-SuF9NTx/recaptcha/page.tsx` - Full-featured test page

### Documentation

- `doc/RECAPTCHA_SETUP.md` - This file (complete setup guide)
- `bin/google-recaptcha-verify.js` - Reference implementation

## Troubleshooting

### Error: "您必須先完成 reCAPTCHA 驗證，才能繼續操作" (Verification Required)

This error means your reCAPTCHA site key needs to be verified in Google Console before it can be used.

**Solution:**

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin) or [reCAPTCHA Enterprise Console](https://console.cloud.google.com/security/recaptcha)
2. Find your site key
3. Complete any required verification steps
4. Wait a few minutes for changes to propagate
5. Try submitting the form again

**The system will automatically detect this error and provide helpful messages:**

- Frontend: Shows "reCAPTCHA site key needs verification. Please contact the administrator."
- Backend logs: Include verification requirement status
- API response: Includes help link to Google Console

### Error: "Could not load the default credentials"

This error appears when Enterprise verification is attempted without proper Google Cloud credentials.

**Solution:** The system automatically falls back to basic verification. To fix:

**Option A: Use Basic Verification Only (Recommended for Development)**

1. Only set `NEXT_PUBLIC_RECAPTCHA` and `RECAPTCHA_SECRET_KEY`
2. Don't set `GOOGLE_CLOUD_PROJECT_ID` or `GOOGLE_APPLICATION_CREDENTIALS`
3. The system will use basic verification only

**Option B: Configure Enterprise (For Production)**

1. Create a Google Cloud service account
2. Download the JSON key file
3. Set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`
4. Or set `GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY` with the JSON content

### Current Setup (Based on Your Configuration)

Your system is currently configured for **Enterprise reCAPTCHA** on the frontend with automatic backend fallback:

```
✓ Frontend: Enterprise reCAPTCHA (grecaptcha.enterprise.execute)
  - Script Location: Root layout (src/app/layout.tsx)
  - Script Component: RecaptchaScript (src/components/recaptcha-script.tsx)
  - Uses: https://www.google.com/recaptcha/enterprise.js
  - Configuration: useEnterprise={true} (configured at root level)
  - Single Instance: One script load for entire application (prevents duplicate errors)
  - Action: "contact_form" (and other actions like "magic_link_signin")
  - Usage: Components use useRecaptcha() hook directly
  - Architecture: Next.js Script component + custom hook (no provider pattern)
✓ Backend: Enterprise verification (if configured) with Basic fallback
  - Tries Enterprise first (if credentials configured)
  - Falls back to Basic verification if Enterprise unavailable
  - Validates action, score, and token validity
```

### Verification Methods

| Method | When Used | Requirements |
|--------|-----------|--------------|
| **Enterprise** | When credentials configured | `GOOGLE_CLOUD_PROJECT_ID` + credentials |
| **Basic** | Default/Fallback | `RECAPTCHA_SECRET_KEY` only |

### Logs to Expect

**Without Enterprise:**

```
Using basic reCAPTCHA verification (Enterprise not configured)
✓ Basic reCAPTCHA verification successful
```

**With Enterprise:**

```
✓ Enterprise reCAPTCHA verification successful
```

**With Enterprise (fallback scenario):**

```
Enterprise reCAPTCHA verification error, falling back to basic: [error]
✓ Basic reCAPTCHA verification successful
```

## Quick Reference

### Key Differences: Standard vs Enterprise

| Feature | Standard reCAPTCHA | reCAPTCHA Enterprise |
|---------|-------------------|---------------------|
| **Setup** | reCAPTCHA Admin Console | Google Cloud Console |
| **API** | `/api/siteverify` | `createAssessment()` |
| **Credentials** | Secret Key | Service Account Key |
| **Cost** | Free (with limits) | Pay per assessment |
| **Features** | Basic verification | Advanced analytics, fraud detection |
| **Site Key** | Different | Must create in GCP |

### Assessment API

The `createAssessment` call is the core of Enterprise verification:

1. **Purpose**: Validates the reCAPTCHA token and analyzes risk
2. **Input**: Token + Site Key + Project ID
3. **Output**: Validation status + Risk score + Reasons
4. **Location**: `src/lib/recaptcha-verify.ts` → `verifyRecaptchaV3()`

### Your Current Setup

Based on your configuration file (`bin/google-recaptcha-verify.js`):

- ✓ You have the Enterprise code structure ready
- ✓ Project ID: `riben-web`
- ✓ Site Key: `6Lf94eArAAAAAOL74I82SUUNAXxPSrMcKYBAfeMf`
- ⚠️ Need to verify: Is this an Enterprise key or standard key?
- ⚠️ Need to add: Service account credentials

### Authentication Methods

From [Google's authentication guide](https://cloud.google.com/recaptcha/docs/create-assessment-website):

| Environment | Method | How to Set Up |
|------------|--------|---------------|
| **Google Cloud** | Attached service accounts | Automatic if deployed on GCP |
| **On-premises / Other cloud** | API keys or Service accounts | Set `GOOGLE_APPLICATION_CREDENTIALS` |
| **Development** | User credentials | Use `gcloud auth application-default login` |

### IAM Role Required

Your service account needs one of these roles:

- **reCAPTCHA Enterprise Agent** (`roles/recaptchaenterprise.agent`) - Recommended
- **reCAPTCHA Enterprise Admin** (`roles/recaptchaenterprise.admin`) - Full access

### Next Steps

1. **Check your site key type:**
   - Go to [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin) for standard keys
   - Go to [reCAPTCHA Enterprise Console](https://console.cloud.google.com/security/recaptcha) for Enterprise keys

2. **If Standard key:** System will use basic verification (working now)

3. **If Enterprise key:** Add service account credentials:

   ```bash
   # Option 1: Point to credentials file
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
   
   # Option 2: Use gcloud auth (development only)
   gcloud auth application-default login
   ```

### Official Resources

- [Install score-based keys on websites](https://docs.cloud.google.com/recaptcha/docs/instrument-web-pages) - Frontend implementation guide (what we follow)
- [Create assessments for websites](https://cloud.google.com/recaptcha/docs/create-assessment-website) - Backend verification guide
- [Interpret assessments](https://cloud.google.com/recaptcha/docs/interpret-assessment-website) - Understanding scores
- [Action names guide](https://cloud.google.com/recaptcha/docs/action-name) - Best practices for actions
- [Authentication setup](https://cloud.google.com/docs/authentication/getting-started) - Credentials guide
