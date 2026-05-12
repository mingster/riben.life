/**
 * Hosts where Next.js image optimization often times out or fails cache tracking
 * when the dev server proxies the image. Use `unoptimized` on `next/image` for these.
 */
const UNOPTIMIZE_IMAGE_HOSTS = new Set<string>([
	"profile.line-scdn.net",
	"lh3.googleusercontent.com",
	"avatars.githubusercontent.com",
	"platform-lookaside.fbsbx.com",
]);

/**
 * Returns true when `src` should use `unoptimized` on `next/image` to load directly in the browser.
 */
export function shouldUnoptimizeRemoteImageUrl(src: string): boolean {
	if (!src.startsWith("http://") && !src.startsWith("https://")) {
		return false;
	}
	try {
		const hostname = new URL(src).hostname;
		return UNOPTIMIZE_IMAGE_HOSTS.has(hostname);
	} catch {
		return false;
	}
}
