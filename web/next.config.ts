import type { NextConfig } from "next";

//const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig: NextConfig = {
	allowedDevOrigins: ["192.168.2.5", "*.192.168.2.5"],
	turbopack: {
		rules: {
			"*.svg": {
				loaders: ["@svgr/webpack"],
				as: "*.js",
			},
		},
	},
	/* config options here */
	transpilePackages: ["lucide-react", "better-auth"],
	//clientInstrumentationHook: true,
	serverExternalPackages: [
		"thread-stream",
		"pino",
		"pino-worker",
		"pino-file",
		"pino-pretty",
	],
	/*
	video: {
		formats: ["video/mp4", "video/webm", "video/ogg"],
		qualities: [25, 50, 75],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "youtu.be",
			},
		],
	},
	*/
	images: {
		formats: ["image/avif", "image/webp"],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		qualities: [25, 50, 75],
		remotePatterns: [
			{
				// google user avatar
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
			{
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
			},
			{
				// line user avatar
				protocol: "https",
				hostname: "profile.line-scdn.net",
				pathname: "**",
			},
			{
				// facebook user avatar
				protocol: "https",
				hostname: "platform-lookaside.fbsbx.com",
				pathname: "**",
			},
			{
				protocol: "https",
				hostname: "tailwindui.com",
				pathname: "**",
			},
			{
				protocol: "https",
				hostname: "res.cloudinary.com",
				pathname: "**",
			},
			{
				// google user avatar
				protocol: "https",
				hostname: "5ik.tv",
			},
		],
	},
};

export default nextConfig;
/*
// Make sure adding Sentry options is the last code to run before exporting
module.exports = withSentryConfig(nextConfig, {
	reactComponentAnnotation: {
		enabled: true,
	},
	org: process.env.SENTRY_ORGANIZATION,
	project: process.env.SENTRY_PROJECT,
	// Only print logs for uploading source maps in CI
	// Set to `true` to suppress logs
	silent: !process.env.CI,
	// Automatically tree-shake Sentry logger statements to reduce bundle size
	disableLogger: true,

	// Pass the auth token
	authToken: process.env.SENTRY_AUTH_TOKEN,
	// Upload a larger set of source maps for prettier stack traces (increases build time)
	widenClientFileUpload: true,
	// Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
	// This can increase your server load as well as your hosting bill.
	// Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-side errors will fail.
	tunnelRoute: "/monitoring",
	enabled: process.env.NODE_ENV === 'production',
	automaticVercelMonitors: true,
});
*/
