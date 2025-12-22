# reCAPTCHA CSP (Content Security Policy) Configuration Guide

## Current Status

✅ **CSP is currently DISABLED** - No CSP restrictions are blocking reCAPTCHA.

The CSP configuration in `src/proxy.ts` (lines 72-108) is commented out, which means:
- ✅ reCAPTCHA scripts can load from Google domains
- ✅ reCAPTCHA API calls can be made
- ✅ No Content Security Policy restrictions are in place

## If You Need to Enable CSP

If you need to enable CSP in the future, you **must** include the following domains for reCAPTCHA to work:

### Required CSP Directives for reCAPTCHA Enterprise

```typescript
const cspHeader = `
  default-src 'self';
  script-src 'self' 
    'unsafe-inline' 
    'unsafe-eval' 
    https://www.google.com 
    https://www.gstatic.com 
    https://www.google.com/recaptcha/;
  style-src 'self' 
    'unsafe-inline' 
    https://www.google.com;
  img-src 'self' 
    blob: 
    data: 
    https://www.google.com 
    https://www.gstatic.com;
  frame-src 'self' 
    https://www.google.com 
    https://www.google.com/recaptcha/;
  connect-src 'self' 
    https://www.google.com 
    https://www.google.com/recaptcha/ 
    https://www.gstatic.com;
  font-src 'self' 
    data: 
    https://www.gstatic.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;
```

### Required Domains

#### Script Loading
- `https://www.google.com` - Main reCAPTCHA script
- `https://www.google.com/recaptcha/enterprise.js` - Enterprise script
- `https://www.gstatic.com` - Static resources

#### API Calls
- `https://www.google.com/recaptcha/api.js` - Standard API
- `https://www.google.com/recaptcha/enterprise.js` - Enterprise API
- `https://www.google.com/recaptcha/api2/` - API endpoints

#### Frames/IFrames
- `https://www.google.com` - reCAPTCHA badge iframe
- `https://www.google.com/recaptcha/` - reCAPTCHA challenge frames

#### Network Requests
- `https://www.google.com` - Token verification
- `https://www.google.com/recaptcha/` - Assessment API calls

### Example: Enabling CSP with reCAPTCHA Support

If you want to enable CSP in `src/proxy.ts`, update it like this:

```typescript
export function proxy(req: NextRequest) {
	const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
	
	const cspHeader = `
		default-src 'self';
		script-src 'self' 
			'unsafe-inline' 
			'unsafe-eval' 
			'nonce-${nonce}' 
			'strict-dynamic'
			https://www.google.com 
			https://www.gstatic.com 
			https://www.google.com/recaptcha/;
		style-src 'self' 
			'unsafe-inline' 
			'nonce-${nonce}'
			https://www.google.com;
		img-src 'self' 
			blob: 
			data: 
			https://www.google.com 
			https://www.gstatic.com;
		frame-src 'self' 
			https://www.google.com 
			https://www.google.com/recaptcha/;
		connect-src 'self' 
			https://www.google.com 
			https://www.google.com/recaptcha/ 
			https://www.gstatic.com;
		font-src 'self' 
			data: 
			https://www.gstatic.com;
		object-src 'none';
		base-uri 'self';
		form-action 'self';
		frame-ancestors 'none';
		upgrade-insecure-requests;
	`;

	const contentSecurityPolicyHeaderValue = cspHeader
		.replace(/\s{2,}/g, ' ')
		.trim();

	const requestHeaders = new Headers(req.headers);
	requestHeaders.set('x-nonce', nonce);
	requestHeaders.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);

	const response = NextResponse.next({
		request: {
			headers: requestHeaders,
		},
	});
	
	response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);
	
	// ... rest of proxy logic
}
```

## CORS Configuration

### Current CORS Status

✅ **CORS is properly configured** for API routes in `src/proxy.ts`:
- API routes allow CORS with proper headers
- External origins are controlled via `FRONTEND_URLS` environment variable
- reCAPTCHA doesn't require CORS configuration (it's loaded as a script, not via API)

### CORS Headers (Already Configured)

```typescript
const CORS_HEADERS = {
	"Access-Control-Allow-Credentials": "true",
	"Access-Control-Allow-Methods": "POST, PUT, PATCH, GET, DELETE, OPTIONS",
	"Content-Type": "application/json",
	Allow: "GET, POST, PATCH, OPTIONS",
	"Access-Control-Allow-Headers":
		"Origin, X-Api-Key, X-Requested-With, Content-Type, Accept, Authorization",
};
```

## Troubleshooting CSP/CORS Issues

### If reCAPTCHA Fails to Load

1. **Check Browser Console**
   - Look for CSP violation errors
   - Look for CORS errors
   - Check Network tab for blocked requests

2. **Check CSP Headers**
   ```bash
   curl -I https://your-domain.com | grep -i "content-security-policy"
   ```

3. **Check CORS Headers**
   ```bash
   curl -I https://your-domain.com/api/your-endpoint | grep -i "access-control"
   ```

4. **Common Issues**
   - Missing `frame-src` directive → reCAPTCHA badge won't load
   - Missing `connect-src` → API calls will fail
   - Missing `script-src` → Script won't load
   - `'unsafe-inline'` required for some reCAPTCHA implementations

### Testing CSP Configuration

1. **Enable CSP in development**
   - Uncomment CSP section in `src/proxy.ts`
   - Add required reCAPTCHA domains
   - Test reCAPTCHA functionality

2. **Use Browser DevTools**
   - Check Console for CSP violations
   - Check Network tab for blocked resources
   - Verify all reCAPTCHA resources load successfully

3. **Test in Production**
   - Deploy with CSP enabled
   - Monitor error logs for CSP violations
   - Verify reCAPTCHA works for all users

## Summary

- ✅ **Current Status**: CSP is disabled, so no restrictions
- ✅ **CORS**: Properly configured for API routes
- ✅ **reCAPTCHA**: Should work without CSP/CORS issues
- ⚠️ **If enabling CSP**: Must include all Google domains listed above

## Related Documentation

- [reCAPTCHA Setup Guide](./RECAPTCHA_SETUP.md)
- [reCAPTCHA Architecture](./RECAPTCHA_ARCHITECTURE_COMPARISON.md)
- [Next.js CSP Guide](https://nextjs.org/docs/pages/guides/content-security-policy)

