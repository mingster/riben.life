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
GOOGLE_CLOUD_PROJECT_ID=pstv-web

# Optional: Google Cloud Service Account Key (for Enterprise)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Setup Options

### Option 1: Basic reCAPTCHA (Minimum Setup)

1. Go to [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Create a new site with reCAPTCHA v3
3. Set `NEXT_PUBLIC_RECAPTCHA` to your site key
4. Set `RECAPTCHA_SECRET_KEY` to your secret key

### Option 2: reCAPTCHA Enterprise (Recommended for Production)

#### Step 1: Set up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing project
3. Enable the **reCAPTCHA Enterprise API**
   - Navigate to APIs & Services > Library
   - Search for "reCAPTCHA Enterprise API"
   - Click Enable

#### Step 2: Create reCAPTCHA Key

1. Go to [reCAPTCHA Enterprise](https://console.cloud.google.com/security/recaptcha)
2. Click **Create Key**
3. Configure the key:
   - Display name: `Contact Form`
   - Platform: `Website`
   - Domains: Add your domains (e.g., `5ik.tv`, `localhost`)
   - reCAPTCHA type: **Score-based**
   - Enable **Use checkbox challenge** (optional)
4. Click **Create**
5. Copy the **Site Key** - this is your `NEXT_PUBLIC_RECAPTCHA`

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

- ⚠️ The site key from reCAPTCHA Enterprise is different from standard reCAPTCHA
- ⚠️ You must use the Enterprise site key if using Enterprise API
- ⚠️ The service account needs proper permissions to create assessments

## How It Works

### Flow Diagram

```
1. User fills out contact form
   ↓
2. Frontend: executeRecaptcha("contact_form") → generates token
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

### Code Implementation

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

- [ ] `NEXT_PUBLIC_RECAPTCHA` environment variable is set
- [ ] reCAPTCHA loads without errors (check browser console)
- [ ] Security verification status shows "ready" in forms
- [ ] Token generation works (check test page)

### ✅ Backend Setup  

- [ ] `RECAPTCHA_SECRET_KEY` environment variable is set
- [ ] API endpoint can verify tokens successfully
- [ ] Logs show correct verification method
- [ ] User context (IP, user agent) is captured

### ✅ Optional Enterprise Setup

- [ ] `GOOGLE_CLOUD_PROJECT_ID` is set
- [ ] Service account credentials are configured
- [ ] reCAPTCHA Enterprise API is enabled
- [ ] IAM permissions are correct
- [ ] Logs show "Enterprise reCAPTCHA verification successful"

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

- ✅ **Enterprise Integration**: Uses Google Cloud reCAPTCHA Enterprise
- ✅ **Fallback Support**: Falls back to basic verification if Enterprise unavailable
- ✅ **Action Verification**: Ensures tokens are for the correct action (`contact_form`)
- ✅ **Score Threshold**: Rejects submissions with scores below 0.5
- ✅ **Detailed Logging**: Comprehensive error logging and debugging
- ✅ **Error Handling**: Graceful handling of network and API errors
- ✅ **Test Tools**: Built-in test page and API endpoint for verification

## Files in This Implementation

### Core Files

- `src/lib/recaptcha-verify.ts` - Verification utility with Enterprise support
- `src/app/api/common/contact-us-mail/route.ts` - Contact form API endpoint
- `src/app/api/common/recaptcha-verify/route.ts` - Test/verification API endpoint
- `src/app/(store)/[storeId]/components/AboutUs.tsx` - Contact form component

### Installation & Testing

- `src/app/install-SuF9NTx/recaptcha-test-widget.tsx` - Reusable test widget
- `src/app/install-SuF9NTx/client-install.tsx` - Installation page (includes test widget)
- `src/app/install-SuF9NTx/recaptcha/page.tsx` - Full-featured test page

### Documentation

- `doc/RECAPTCHA_SETUP.md` - This file (complete setup guide)
- `bin/google-recaptcha-verify.js` - Reference implementation

## Troubleshooting

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

Your system is currently configured for **Basic Verification** with automatic fallback:

```
✓ Frontend: ReCAPTCHA v3 (invisible)
✓ Backend: Basic verification via Google API
✓ Fallback: Automatic if Enterprise not configured
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
- ✓ Project ID: `pstv-web`
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

- [Create assessments for websites](https://cloud.google.com/recaptcha/docs/create-assessment-website) - Main guide
- [Interpret assessments](https://cloud.google.com/recaptcha/docs/interpret-assessment-website) - Understanding scores
- [Action names guide](https://cloud.google.com/recaptcha/docs/action-name) - Best practices for actions
- [Authentication setup](https://cloud.google.com/docs/authentication/getting-started) - Credentials guide
