# reCAPTCHA Architecture Comparison: Our Implementation vs. Best Practices

**Date:** 2025-01-21\
**Status:** ✅ Aligned with Best Practices

## Executive Summary

Our reCAPTCHA architecture uses **Next.js Script component** with a **custom hook** that directly accesses the grecaptcha API. This approach works better with Next.js App Router than provider patterns and provides optimal performance and compatibility.

## Comparison with Best Practices

### ✅ 1. Single Script Load (Next.js Script Pattern)

**Best Practice:** Load third-party scripts once using Next.js Script component for optimal performance and compatibility.

**Our Implementation:**

```typescript
// src/app/layout.tsx (Root Layout)
<body>
  <RecaptchaScript useEnterprise={true} />
  {children}
</body>
```

**Status:** ✅ **ALIGNED**

* Script component is at root layout level
* Single script load across entire application
* Prevents "reCAPTCHA has already been loaded" errors
* Uses Next.js Script component (optimized loading)

**Why This is Better:**

* Next.js optimized script loading
* Prevents duplicate script loading
* Ensures consistent configuration
* Better performance (script loads once)
* Works better with App Router than provider pattern

### ✅ 2. Server-Side Validation

**Best Practice:** Always validate reCAPTCHA tokens on the server.

**Our Implementation:**

```typescript
// src/lib/recaptcha-verify.ts
export async function verifyRecaptcha(token: string, options?: {...}) {
  // Enterprise verification with fallback to basic
  // Validates token, action, and score
}
```

**Status:** ✅ **ALIGNED**

* Server-side validation implemented
* Enterprise API with basic fallback
* Action validation
* Score threshold checking
* Comprehensive error handling

### ✅ 3. Environment Variables

**Best Practice:** Store keys in environment variables.

**Our Implementation:**

```bash
NEXT_PUBLIC_RECAPTCHA=your_site_key
RECAPTCHA_SECRET_KEY=your_secret_key
GOOGLE_CLOUD_PROJECT_ID=riben-web
GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
```

**Status:** ✅ **ALIGNED**

* Site key in `NEXT_PUBLIC_*` (exposed to client)
* Secret key without prefix (server-only)
* Enterprise credentials properly secured

### ✅ 4. Component Usage Pattern

**Best Practice:** Components should use hooks directly without wrapping.

**Our Implementation:**

```typescript
// Components use custom hook directly
import { useRecaptcha } from "@/hooks/use-recaptcha";

function MyComponent() {
  const { executeRecaptcha, isReady } = useRecaptcha(true);
  // Use executeRecaptcha directly
  // Check isReady before executing
}
```

**Status:** ✅ **ALIGNED**

* Components use `useRecaptcha()` hook directly
* No wrapper components needed
* No provider pattern required
* Clean, maintainable code
* Follows React hooks best practices
* Better Next.js App Router compatibility

### ✅ 5. Enterprise Mode Support

**Best Practice:** Use Enterprise reCAPTCHA for production applications.

**Our Implementation:**

```typescript
<RecaptchaScript useEnterprise={true} />
// Components use hook with Enterprise mode
const { executeRecaptcha } = useRecaptcha(true);
```

**Status:** ✅ **ALIGNED**

* Enterprise mode configured at root level
* All components automatically use Enterprise API
* Backend supports Enterprise with basic fallback
* Follows Google Cloud documentation

## Architecture Pattern Comparison

### ❌ Common Pattern (Not Recommended)

Many guides show these patterns, which can cause issues:

```typescript
// ❌ Each component creates its own provider
function ContactForm() {
  return (
    <GoogleReCaptchaProvider siteKey={siteKey}>
      <Form />
    </GoogleReCaptchaProvider>
  );
}

// ❌ Provider pattern can have issues with Next.js hot reload
<RecaptchaProvider>
  {children}
</RecaptchaProvider>
```

**Problems:**

* Multiple provider instances
* Duplicate script loading
* "reCAPTCHA has already been loaded" errors
* Inconsistent configuration
* Hot reload issues with Next.js
* Provider pattern doesn't work well with App Router

### ✅ Our Pattern (Recommended)

Next.js Script component with custom hook:

```typescript
// ✅ Root layout - single script load
// src/app/layout.tsx
<body>
  <RecaptchaScript useEnterprise={true} />
  {children}
</body>

// ✅ Components use hook directly
function ContactForm() {
  const { executeRecaptcha, isReady } = useRecaptcha(true);
  // Use hook directly, check isReady
}
```

**Benefits:**

* Single script load
* No duplicate scripts
* Consistent configuration
* Better performance
* Works perfectly with Next.js App Router
* No hot reload issues
* Next.js Script component optimization

## Next.js Best Practices Alignment

Our implementation follows **Next.js App Router best practices**:

### ✅ 1. Script at Root Level

**Next.js Best Practice:** Load third-party scripts at the root level using Script component.

**Our Implementation:** ✅ Script component in root layout (`src/app/layout.tsx`)

### ✅ 2. Single Script Load

**Next.js Best Practice:** Load scripts once to avoid duplicates and improve performance.

**Our Implementation:** ✅ Only one `RecaptchaScript` component in entire codebase

### ✅ 3. Hook-Based Access

**React Best Practice:** Components should use hooks for clean API access.

**Our Implementation:** ✅ All components use `useRecaptcha()` hook

### ✅ 4. Consistent Configuration

**Best Practice:** Script configuration should be consistent across the app.

**Our Implementation:** ✅ Enterprise mode configured once at root level

## Next.js App Router Best Practices Alignment

### ✅ 1. Root Layout for Global Scripts

**Next.js Best Practice:** Use root layout for global scripts and providers.

**Our Implementation:** ✅ reCAPTCHA script in root layout alongside other providers

### ✅ 2. Script Component for Third-Party Scripts

**Next.js Best Practice:** Use Next.js Script component for third-party scripts.

**Our Implementation:** ✅ Uses Next.js Script component with `strategy="afterInteractive"`

### ✅ 3. Server Components by Default

**Next.js Best Practice:** Use Server Components by default, Client Components when needed.

**Our Implementation:** ✅ Root layout is Server Component, script component is Client Component

## Implementation Considerations

### Direct grecaptcha API Access

**Standard Pattern:**

```typescript
// Many guides use provider pattern
<GoogleReCaptchaProvider reCaptchaKey={siteKey}>
  <App />
</GoogleReCaptchaProvider>
```

**Our Implementation:**

```typescript
// Our pattern (Next.js optimized)
<RecaptchaScript useEnterprise={true} />
// Components use custom hook
const { executeRecaptcha } = useRecaptcha(true);
```

**Enhancements:**

* ✅ Uses Next.js Script component for optimal loading
* ✅ Custom hook directly accesses grecaptcha API
* ✅ Enterprise mode support
* ✅ Script loading state monitoring
* ✅ Graceful degradation
* ✅ Better Next.js App Router compatibility
* ✅ No provider pattern issues

## Performance Considerations

### ✅ Script Loading

**Best Practice:** Load reCAPTCHA script once, not multiple times.

**Our Implementation:** ✅ Single script component = single script load

**Performance Impact:**

* Reduces initial page load time
* Prevents duplicate network requests
* Better browser caching
* Next.js Script component optimization

### ✅ Code Splitting

**Best Practice:** Use Next.js Script component for optimal loading strategy.

**Our Implementation:** ✅ Uses Next.js Script with `strategy="afterInteractive"`

**Note:** The Next.js Script component loads the script asynchronously after the page becomes interactive, so it doesn't block initial render.

## Security Considerations

### ✅ Server-Side Validation

**Best Practice:** Always validate tokens on the server.

**Our Implementation:** ✅ Comprehensive server-side validation with Enterprise API

### ✅ Environment Variables

**Best Practice:** Never expose secret keys to the client.

**Our Implementation:** ✅ Secret keys are server-only (no `NEXT_PUBLIC_` prefix)

### ✅ Action Validation

**Best Practice:** Validate that tokens are for the correct action.

**Our Implementation:** ✅ Backend validates action matches expected value

## Comparison Summary

| Aspect | General Guides | Our Implementation | Status |
|--------|---------------|-------------------|--------|
| **Script Loading** | Component-level (can cause duplicates) | Root layout (single instance) | ✅ Better |
| **Script Instances** | Multiple (per component) | Single (root level) | ✅ Better |
| **Component Usage** | Wrap with provider | Use hook directly | ✅ Better |
| **Architecture** | Provider pattern | Next.js Script + custom hook | ✅ Better |
| **Server Validation** | Basic verification | Enterprise + Basic fallback | ✅ Better |
| **Error Handling** | Basic | Comprehensive | ✅ Better |
| **Enterprise Support** | Not always covered | Full Enterprise support | ✅ Better |
| **Performance** | Multiple script loads | Single script load | ✅ Better |
| **Next.js Compatibility** | Provider issues | Script component optimized | ✅ Better |

## Conclusion

✅ **Our implementation is ALIGNED with and EXCEEDS best practices.**

**Key Advantages:**

1. **Next.js Script Component** - Optimal script loading with Next.js
2. **Root Layout Placement** - Standard Next.js App Router pattern
3. **Hook-Based Access** - Modern React pattern
4. **Enterprise Support** - Production-ready
5. **Better Performance** - Single script load
6. **Comprehensive Validation** - Enterprise + Basic fallback
7. **No Provider Pattern** - Works better with Next.js App Router

**Why Our Approach is Recommended:**

1. **Prevents Common Errors:**
   * No "reCAPTCHA has already been loaded" errors
   * No duplicate script warnings
   * No configuration conflicts
   * No hot reload issues

2. **Follows Next.js Patterns:**
   * Script component at root level
   * Hook-based component access
   * Single source of truth
   * Better App Router compatibility

3. **Next.js App Router Compatible:**
   * Root layout for global scripts
   * Server/Client component separation
   * Proper hydration handling
   * No provider pattern issues

4. **Production Ready:**
   * Enterprise mode support
   * Comprehensive error handling
   * Performance optimized
   * Better hot reload handling

## Recommendations

Our current architecture is **optimal** and follows best practices. No changes needed.

**Maintained Best Practices:**

* ✅ Keep script component at root layout
* ✅ Use hooks directly in components
* ✅ Maintain single script load
* ✅ Continue Enterprise mode support
* ✅ Keep comprehensive server-side validation
* ✅ Use Next.js Script component for optimal loading
