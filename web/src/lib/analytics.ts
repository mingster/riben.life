import { sendGAEvent } from "@next/third-parties/google";

// Wrapper to only send GA events in production
const sendGAEventSafe = (params: Parameters<typeof sendGAEvent>[0]) => {
	if (process.env.NODE_ENV === "production") {
		sendGAEvent(params);
	}
};

// Enhanced analytics utilities for the 5ik.TV platform
export const analytics = {
	// User authentication events
	trackLogin: (method: "email" | "google" | "line" | "passkey" = "email") => {
		sendGAEventSafe({
			event: "login",
			method: method,
		});
	},

	trackSignUp: (method: "email" | "google" | "line" = "email") => {
		sendGAEventSafe({
			event: "sign_up",
			method: method,
		});
	},

	trackLogout: () => {
		sendGAEventSafe({
			event: "logout",
			event_category: "authentication",
		});
	},

	// Video/TV content events
	trackChannelWatch: (channelName: string, channelId?: string) => {
		sendGAEventSafe({
			event: "channel_watched",
			event_category: "content",
			event_label: channelName,
			channel_id: channelId,
		});
	},

	trackVideoPlay: (
		videoTitle: string,
		videoId?: string,
		channelName?: string,
	) => {
		sendGAEventSafe({
			event: "video_play",
			event_category: "video",
			event_label: videoTitle,
			video_id: videoId,
			channel_name: channelName,
		});
	},

	trackVideoComplete: (
		videoTitle: string,
		videoId?: string,
		channelName?: string,
	) => {
		sendGAEventSafe({
			event: "video_complete",
			event_category: "video",
			event_label: videoTitle,
			video_id: videoId,
			channel_name: channelName,
		});
	},

	trackVideoPause: (
		videoTitle: string,
		videoId?: string,
		position?: number,
	) => {
		sendGAEventSafe({
			event: "video_pause",
			event_category: "video",
			event_label: videoTitle,
			video_id: videoId,
			video_position: position,
		});
	},

	trackVideoSeek: (
		videoTitle: string,
		videoId?: string,
		fromPosition?: number,
		toPosition?: number,
	) => {
		sendGAEventSafe({
			event: "video_seek",
			event_category: "video",
			event_label: videoTitle,
			video_id: videoId,
			seek_from: fromPosition,
			seek_to: toPosition,
		});
	},

	// EPG (Electronic Program Guide) events
	trackEPGView: (
		programTitle: string,
		channelName: string,
		startTime?: string,
	) => {
		sendGAEventSafe({
			event: "epg_view",
			event_category: "epg",
			event_label: programTitle,
			channel_name: channelName,
			program_start_time: startTime,
		});
	},

	trackProgramReminder: (
		programTitle: string,
		channelName: string,
		reminderTime?: string,
	) => {
		sendGAEventSafe({
			event: "program_reminder",
			event_category: "epg",
			event_label: programTitle,
			channel_name: channelName,
			reminder_time: reminderTime,
		});
	},

	// Device and platform events
	trackDeviceRegistration: (
		deviceType: "android_tv" | "roku" | "web",
		deviceId?: string,
	) => {
		sendGAEventSafe({
			event: "device_registration",
			event_category: "device",
			device_type: deviceType,
			device_id: deviceId,
		});
	},

	trackDeviceLinking: (
		deviceType: "android_tv" | "roku",
		success: boolean = true,
	) => {
		sendGAEventSafe({
			event: "device_linking",
			event_category: "device",
			device_type: deviceType,
			success: success,
		});
	},

	// Search and discovery events
	trackChannelSearch: (searchTerm: string, resultsCount?: number) => {
		sendGAEventSafe({
			event: "search",
			search_term: searchTerm,
			results_count: resultsCount,
		});
	},

	trackProgramSearch: (searchTerm: string, resultsCount?: number) => {
		sendGAEventSafe({
			event: "program_search",
			event_category: "search",
			search_term: searchTerm,
			results_count: resultsCount,
		});
	},

	// User preferences and settings
	trackLanguageChange: (fromLanguage: string, toLanguage: string) => {
		sendGAEventSafe({
			event: "language_change",
			event_category: "preferences",
			from_language: fromLanguage,
			to_language: toLanguage,
		});
	},

	trackThemeChange: (theme: "light" | "dark" | "system") => {
		sendGAEventSafe({
			event: "theme_change",
			event_category: "preferences",
			theme: theme,
		});
	},

	// Error tracking
	trackError: (errorType: string, errorMessage: string, page?: string) => {
		sendGAEventSafe({
			event: "exception",
			event_category: "error",
			error_type: errorType,
			error_message: errorMessage,
			page: page,
		});
	},

	trackVideoError: (
		errorType: string,
		videoId?: string,
		channelName?: string,
	) => {
		sendGAEventSafe({
			event: "video_error",
			event_category: "error",
			error_type: errorType,
			video_id: videoId,
			channel_name: channelName,
		});
	},

	// Performance tracking
	trackPageLoadTime: (page: string, loadTime: number) => {
		sendGAEventSafe({
			event: "timing_complete",
			event_category: "performance",
			page: page,
			load_time: loadTime,
		});
	},

	trackVideoLoadTime: (videoId: string, loadTime: number) => {
		sendGAEventSafe({
			event: "video_load_time",
			event_category: "performance",
			video_id: videoId,
			load_time: loadTime,
		});
	},

	// Social and sharing events
	trackShare: (
		platform: "facebook" | "twitter" | "line" | "whatsapp",
		content: string,
		contentType: "channel" | "program" | "video",
	) => {
		sendGAEventSafe({
			event: "share",
			event_category: "social",
			method: platform,
			content_type: contentType,
			content: content,
		});
	},

	// Subscription and payment events (if applicable)
	trackSubscriptionStart: (
		planType: string,
		price?: number,
		currency?: string,
	) => {
		sendGAEventSafe({
			event: "purchase",
			event_category: "subscription",
			plan_type: planType,
			value: price,
			currency: currency,
		});
	},

	trackSubscriptionCancel: (planType: string, reason?: string) => {
		sendGAEventSafe({
			event: "subscription_cancel",
			event_category: "subscription",
			plan_type: planType,
			cancel_reason: reason,
		});
	},

	// Custom event tracking
	trackCustomEvent: (eventName: string, parameters?: Record<string, any>) => {
		sendGAEventSafe({
			event: eventName,
			...parameters,
		});
	},
};

// Hook for easy analytics integration
export function useAnalytics() {
	return {
		...analytics,
		// Add any additional hook-specific functionality here
	};
}
