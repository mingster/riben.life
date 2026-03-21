import { z } from "zod";

// Channel-specific credential schemas
const lineCredentialsSchema = z.object({
	channelId: z.string().optional(),
	channelSecret: z.string().optional(),
	accessToken: z.string().optional(),
	/** LINE bot user ID (U-prefixed) - from webhook destination when destination is U-prefixed */
	botUserId: z.string().optional(),
	/** Alternative to botUserId - webhook destination when in 1:1 chat */
	destination: z.string().optional(),
});

const whatsappCredentialsSchema = z.object({
	phoneNumberId: z.string().optional(),
	accessToken: z.string().optional(),
	businessAccountId: z.string().optional(),
});

const wechatCredentialsSchema = z.object({
	appId: z.string().optional(),
	appSecret: z.string().optional(),
	accessToken: z.string().optional(),
});

const smsCredentialsSchema = z.object({
	apiKey: z.string().optional(),
	apiSecret: z.string().optional(),
	fromNumber: z.string().optional(),
});

const telegramCredentialsSchema = z.object({
	botToken: z.string().optional(),
	chatId: z.string().optional(),
});

const pushCredentialsSchema = z.object({
	fcmServerKey: z.string().optional(),
	apnsKeyId: z.string().optional(),
	apnsTeamId: z.string().optional(),
	apnsBundleId: z.string().optional(),
});

// Channel-specific settings schemas
const channelSettingsSchema = z.record(z.string(), z.any()).optional();

/** Channels allowed in store notification channel config (excludes onsite). */
export const UPDATE_CHANNEL_CONFIG_CHANNELS = [
	"email",
	"line",
	"whatsapp",
	"wechat",
	"sms",
	"telegram",
	"push",
] as const;

export type UpdateChannelConfigChannel =
	(typeof UPDATE_CHANNEL_CONFIG_CHANNELS)[number];

export function isUpdateChannelConfigChannel(
	id: string,
): id is UpdateChannelConfigChannel {
	return (UPDATE_CHANNEL_CONFIG_CHANNELS as readonly string[]).includes(id);
}

export const updateChannelConfigSchema = z.object({
	storeId: z.string().min(1, "Store ID is required"),
	channel: z.enum(UPDATE_CHANNEL_CONFIG_CHANNELS),
	enabled: z.boolean().default(false),
	credentials: z
		.union([
			lineCredentialsSchema,
			whatsappCredentialsSchema,
			wechatCredentialsSchema,
			smsCredentialsSchema,
			telegramCredentialsSchema,
			pushCredentialsSchema,
		])
		.optional()
		.nullable(),
	settings: channelSettingsSchema,
});

export type UpdateChannelConfigInput = z.infer<
	typeof updateChannelConfigSchema
>;
