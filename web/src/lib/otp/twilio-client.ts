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
