/**
 * Core types for the Notification System
 */

export type NotificationType =
	| "order"
	| "reservation"
	| "credit"
	| "payment"
	| "system"
	| "marketing";

export type NotificationChannel =
	| "onsite"
	| "email"
	| "line"
	| "whatsapp"
	| "wechat"
	| "sms"
	| "telegram"
	| "push";

export type NotificationPriority = 0 | 1 | 2; // 0=normal, 1=high, 2=urgent

export type DeliveryStatus =
	| "pending"
	| "sent"
	| "delivered"
	| "read"
	| "failed"
	| "bounced";

export interface CreateNotificationInput {
	senderId: string;
	recipientId: string;
	storeId?: string | null;
	subject: string;
	message: string;
	notificationType?: NotificationType | null;
	actionUrl?: string | null;
	priority?: NotificationPriority;
	channels?: NotificationChannel[];
	templateId?: string | null;
	templateVariables?: Record<string, any>;
}

export interface Notification {
	id: string;
	senderId: string;
	recipientId: string;
	storeId: string | null;
	subject: string;
	message: string;
	notificationType: string | null;
	actionUrl: string | null;
	priority: NotificationPriority;
	createdAt: bigint;
	updatedAt: bigint;
	isRead: boolean;
	isDeletedByAuthor: boolean;
	isDeletedByRecipient: boolean;
}

export interface DeliveryResult {
	success: boolean;
	channel: NotificationChannel;
	messageId?: string;
	error?: string;
	deliveredAt?: bigint;
}

export interface BulkNotificationInput {
	recipientIds: string[];
	senderId: string;
	storeId?: string | null;
	subject: string;
	message: string;
	notificationType?: NotificationType | null;
	actionUrl?: string | null;
	priority?: NotificationPriority;
	channels?: NotificationChannel[];
	templateId?: string | null;
	templateVariables?: Record<string, any>;
}

export interface BulkResult {
	total: number;
	successful: number;
	failed: number;
	results: Array<{
		recipientId: string;
		result: DeliveryResult[];
	}>;
}

export interface NotificationStatus {
	notificationId: string;
	status: DeliveryStatus;
	channels: Array<{
		channel: NotificationChannel;
		status: DeliveryStatus;
		messageId?: string;
		deliveredAt?: bigint;
		readAt?: bigint;
		error?: string;
	}>;
}

export interface ChannelConfig {
	storeId: string;
	enabled: boolean;
	credentials: Record<string, string>; // Encrypted API keys/tokens
	settings: Record<string, any>; // Channel-specific settings
}

export interface ValidationResult {
	valid: boolean;
	errors?: string[];
}

export interface DeliveryStatusInfo {
	status: DeliveryStatus;
	messageId?: string;
	deliveredAt?: bigint;
	readAt?: bigint;
	error?: string;
}

export interface RenderedTemplate {
	subject: string;
	body: string;
	textBody?: string; // For email channels
}

export interface NotificationContext {
	user?: {
		id: string;
		name?: string | null;
		email?: string | null;
	};
	store?: {
		id: string;
		name?: string | null;
	};
	order?: {
		id: string;
		total?: number;
	};
	reservation?: {
		id: string;
		date?: bigint;
	};
	[key: string]: any; // Allow custom context variables
}

export interface UserNotificationPreferences {
	userId?: string;
	storeId?: string;
	onSiteEnabled: boolean;
	emailEnabled: boolean;
	lineEnabled: boolean;
	whatsappEnabled: boolean;
	wechatEnabled: boolean;
	smsEnabled: boolean;
	telegramEnabled: boolean;
	pushEnabled: boolean;
	orderNotifications: boolean;
	reservationNotifications: boolean;
	creditNotifications: boolean;
	paymentNotifications: boolean;
	systemNotifications: boolean;
	marketingNotifications: boolean;
	frequency: "immediate" | "daily_digest" | "weekly_digest";
}
