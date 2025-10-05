import logger from "@/lib/logger";
import nodemailer from "nodemailer";

// Connection pool for better performance
let transportPool: nodemailer.Transporter | null = null;

interface SendMailOptions {
	fromName: string;
	from: string;
	to: string;
	subject: string;
	textMessage: string;
	htmMessage: string;
	cc?: string;
	bcc?: string;
	toName?: string;
	retries?: number;
}

// Initialize transport with connection pooling
function getTransport(): nodemailer.Transporter {
	if (!transportPool) {
		if (!process.env.EMAIL_SERVER_HOST || !process.env.EMAIL_SERVER_PORT) {
			throw new Error("Email server configuration is missing");
		}

		const host = process.env.EMAIL_SERVER_HOST;
		const port = Number(process.env.EMAIL_SERVER_PORT);

		transportPool = nodemailer.createTransport({
			host,
			port,
			//secure: true, // upgrade later with STARTTLS
			auth: {
				user: process.env.EMAIL_SERVER_USER,
				pass: process.env.EMAIL_SERVER_PASSWORD,
			},
			tls: {
				// do NOT fail on invalid certs
				rejectUnauthorized: false,
			},
			pool: true, // Use pooled connections
			maxConnections: 5, // Maximum number of connections
			maxMessages: 100, // Maximum number of messages per connection
			rateLimit: 5, // Maximum messages per second
		});

		// Verify connection on startup
		transportPool.verify((error) => {
			if (error) {
				logger.error(`SMTP connection failed: ${error.message}`, {
					message: "SMTP connection failed",
					metadata: { error: error.message },
					tags: ["getTransport"],
					service: "send-mail",
					environment: process.env.NODE_ENV,
					version: process.env.npm_package_version,
				});
			} else {
				////logger.info("SMTP connection established");
			}
		});
	}

	return transportPool;
}

// Clean HTML content to prevent encoding issues
function cleanHtmlContent(html: string): string {
	// Remove any existing quoted-printable encoding artifacts
	return html
		.replace(/=3D/g, "=")
		.replace(/=0D=0A/g, "\n")
		.replace(/=0A/g, "\n")
		.replace(/=0D/g, "\r");
}

// Input validation
function validateEmailInput(options: SendMailOptions): void {
	const { from, to, subject, textMessage, htmMessage } = options;

	if (!from || !to || !subject || !textMessage || !htmMessage) {
		throw new Error("Missing required email parameters");
	}

	// Basic email validation
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(from) || !emailRegex.test(to)) {
		throw new Error("Invalid email format");
	}

	// Check message length limits
	if (textMessage.length > 1000000 || htmMessage.length > 1000000) {
		throw new Error("Message content too large");
	}
}

// Retry logic with exponential backoff
async function sendWithRetry(
	transport: nodemailer.Transporter,
	mailOptions: nodemailer.SendMailOptions,
	maxRetries: number = 3,
): Promise<nodemailer.SentMessageInfo> {
	let lastError: Error;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			const startTime = Date.now();
			const result = await transport.sendMail(mailOptions);
			const duration = Date.now() - startTime;
			//logger.info(`Email sent successfully in ${duration}ms`);

			return result;
		} catch (error) {
			lastError = error as Error;

			if (attempt < maxRetries) {
				// Exponential backoff: 1s, 2s, 4s
				const delay = Math.pow(2, attempt - 1) * 1000;
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	throw lastError!;
}

export async function sendMail(
	fromName: string,
	from: string,
	to: string,
	subject: string,
	textMessage: string,
	htmMessage: string,
	cc?: string,
	bcc?: string,
	toName?: string,
	retries: number = 3,
): Promise<boolean> {
	const startTime = Date.now();

	// Validate inputs
	validateEmailInput({
		fromName,
		from,
		to,
		subject,
		textMessage,
		htmMessage,
		cc,
		bcc,
		toName,
		retries,
	});

	// Get transport with connection pooling
	const transport = getTransport();

	// Set default names if not provided
	const finalToName = toName || to;
	const finalFromName = fromName || from;

	// Clean HTML content to prevent encoding issues
	const cleanedHtml = cleanHtmlContent(htmMessage);
	const cleanedText = cleanHtmlContent(textMessage);

	// Prepare mail options
	const mailOptions: nodemailer.SendMailOptions = {
		from: `${finalFromName} <${from}>`,
		to: `${finalToName} <${to}>`,
		replyTo: from,
		cc: cc || undefined,
		bcc: bcc || undefined,
		subject,
		text: cleanedText,
		html: cleanedHtml,
		// Add headers for better deliverability
		headers: {
			"X-Priority": "3",
			"X-MSMail-Priority": "Normal",
			Importance: "normal",
			//"Content-Type": "text/html; charset=UTF-8",
		},
	};

	// Send with retry logic
	const result = await sendWithRetry(transport, mailOptions, retries);

	// Check for failed recipients
	const failed = result.rejected.concat(result.pending).filter(Boolean);

	if (failed.length) {
		logger.error(`Email partially failed in ${Date.now() - startTime}ms`, {
			message: "Email partially failed",
			metadata: { failed, duration: Date.now() - startTime },
			tags: ["sendMail"],
			service: "send-mail",
			environment: process.env.NODE_ENV,
			version: process.env.npm_package_version,
		});
		return false;
	}

	//logger.info(`Email sent successfully in ${Date.now() - startTime}ms`);

	return true;
}

// Cleanup function for graceful shutdown
export function closeTransportPool(): void {
	if (transportPool) {
		transportPool.close();
		transportPool = null;
		//logger.info("SMTP transport pool closed");
	}
}
