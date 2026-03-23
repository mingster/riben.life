import pino from "pino";
import {
	transformBigIntToNumbers,
	transformDecimalsToNumbers,
} from "@/utils/edge-utils";
import { getUtcNowEpoch, dateToEpoch } from "@/utils/datetime-utils";
import { analytics } from "./analytics";

const isProduction = process.env.NODE_ENV === "production";

// Create Pino logger with conditional configuration
const pinoLogger = isProduction
	? pino({
			level: process.env.LOG_LEVEL || "info",
		})
	: pino({
			transport: {
				target: "pino-pretty",
				options: {
					colorize: true, // Enables colored output
					colorizeObjects: true, //--colorizeObjects
					translateTime: true, // Adds timestamps
					ignore: "pid,hostname", // Removes unnecessary fields
				},
			},
			level: "debug", // Default level for development
		});

/** Matches `system_logs` @db.VarChar limits in prisma/schema.prisma — prevents insert failures. */
const SYSTEM_LOG_LIMITS = {
	level: 10,
	service: 100,
	environment: 20,
	version: 50,
	requestId: 100,
	userId: 100,
	sessionId: 100,
	ip: 45,
	userAgent: 500,
	url: 1000,
	method: 10,
	errorCode: 100,
	source: 100,
} as const;

function truncateUtf8(str: string, maxChars: number): string {
	if (str.length <= maxChars) {
		return str;
	}
	return str.slice(0, maxChars);
}

interface LogEntry {
	level: "error" | "warn" | "info" | "debug";
	message: string;
	timestamp?: string;
	service?: string;
	environment?: string;
	version?: string;
	requestId?: string;
	userId?: string;
	sessionId?: string;
	ip?: string;
	userAgent?: string;
	url?: string;
	method?: string;
	statusCode?: number;
	duration?: number;
	errorCode?: string;
	stackTrace?: string;
	metadata?: Record<string, any>;
	tags?: string[];
	source?: string;
	module?: string;
	line?: number;
	column?: number;
}

class Logger {
	private service: string;
	private environment: string;
	private version?: string;

	constructor(
		options: {
			service?: string;
			environment?: string;
			version?: string;
		} = {},
	) {
		this.service = options.service || "web";
		this.environment =
			options.environment || process.env.NODE_ENV || "development";
		this.version = options.version || process.env.npm_package_version;
	}

	private async logToDatabase(entry: LogEntry): Promise<void> {
		if (typeof window !== "undefined") {
			return;
		}
		try {
			const { sqlClient } = await import("./prismadb");
			// Convert timestamp to BigInt epoch milliseconds
			let timestamp: bigint;
			if (entry.timestamp) {
				const parsedDate = new Date(entry.timestamp);
				const epoch = dateToEpoch(parsedDate);
				timestamp = epoch ?? getUtcNowEpoch();
			} else {
				timestamp = getUtcNowEpoch();
			}

			const service = truncateUtf8(
				entry.service || this.service,
				SYSTEM_LOG_LIMITS.service,
			);
			const environment = truncateUtf8(
				entry.environment || this.environment,
				SYSTEM_LOG_LIMITS.environment,
			);
			const version = entry.version || this.version;
			await sqlClient.system_logs.create({
				data: {
					timestamp,
					createdAt: getUtcNowEpoch(),
					level: truncateUtf8(entry.level, SYSTEM_LOG_LIMITS.level),
					message: entry.message,
					service,
					environment,
					version: version
						? truncateUtf8(version, SYSTEM_LOG_LIMITS.version)
						: undefined,
					requestId: entry.requestId
						? truncateUtf8(entry.requestId, SYSTEM_LOG_LIMITS.requestId)
						: undefined,
					userId: entry.userId
						? truncateUtf8(entry.userId, SYSTEM_LOG_LIMITS.userId)
						: undefined,
					sessionId: entry.sessionId
						? truncateUtf8(entry.sessionId, SYSTEM_LOG_LIMITS.sessionId)
						: undefined,
					ip: entry.ip
						? truncateUtf8(entry.ip, SYSTEM_LOG_LIMITS.ip)
						: undefined,
					userAgent: entry.userAgent
						? truncateUtf8(entry.userAgent, SYSTEM_LOG_LIMITS.userAgent)
						: undefined,
					url: entry.url
						? truncateUtf8(entry.url, SYSTEM_LOG_LIMITS.url)
						: undefined,
					method: entry.method
						? truncateUtf8(entry.method, SYSTEM_LOG_LIMITS.method)
						: undefined,
					statusCode: entry.statusCode || undefined,
					duration: entry.duration || undefined,
					errorCode: entry.errorCode
						? truncateUtf8(entry.errorCode, SYSTEM_LOG_LIMITS.errorCode)
						: undefined,
					stackTrace: entry.stackTrace || undefined,
					metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
					tags: entry.tags ? entry.tags.join(",") : null,
					source: entry.source
						? truncateUtf8(entry.source, SYSTEM_LOG_LIMITS.source)
						: undefined,
					line: entry.line || undefined,
					column: entry.column || undefined,
				},
			});
		} catch (error) {
			// Fallback to console if database logging fails
			console.error("Failed to log to database:", error);
			console.log(`[${entry.level.toUpperCase()}] ${entry.message}`, entry);
		}
	}

	private logWithPino(level: string, message: string, metadata?: any): void {
		const logData = {
			service: this.service,
			environment: this.environment,
			version: this.version,
			...metadata,
		};

		switch (level) {
			case "error":
				pinoLogger.error({ ...logData }, message);
				break;
			case "warn":
				pinoLogger.warn({ ...logData }, message);
				break;
			case "debug":
				pinoLogger.debug({ ...logData }, message);
				break;
			default:
				pinoLogger.info({ ...logData }, message);
		}
	}

	info(message: string | any, metadata?: Partial<LogEntry>): void {
		let logMessage: string;
		let logMetadata: Partial<LogEntry> | undefined;

		if (typeof message === "string") {
			logMessage = message;
			logMetadata = metadata;
		} else {
			try {
				logMessage = JSON.stringify(message);
				logMetadata = { ...metadata, metadata: message };
			} catch (_error) {
				transformBigIntToNumbers(message);
				transformDecimalsToNumbers(message);
				logMessage = JSON.stringify(message);
				logMetadata = { ...metadata, metadata: message };
			}
		}

		const entry: LogEntry = {
			level: "info",
			message: logMessage,
			timestamp: new Date().toISOString(),
			...logMetadata,
		};

		// In development: use Pino
		if (!isProduction) {
			this.logWithPino("info", logMessage, logMetadata);
			return;
		}

		// In production: only database
		this.logToDatabase(entry);
	}

	warn(message: string | any, metadata?: Partial<LogEntry>): void {
		let logMessage: string;
		let logMetadata: Partial<LogEntry> | undefined;

		if (typeof message === "string") {
			logMessage = message;
			logMetadata = metadata;
		} else {
			logMessage = JSON.stringify(message);
			logMetadata = { ...metadata, metadata: message };
		}

		const entry: LogEntry = {
			level: "warn",
			message: logMessage,
			timestamp: new Date().toISOString(),
			...logMetadata,
		};

		// In development: use Pino
		if (!isProduction) {
			this.logWithPino("warn", logMessage, logMetadata);
			return;
		}

		// In production: only database
		this.logToDatabase(entry);
	}

	error(message: string | Error | any, metadata?: Partial<LogEntry>): void {
		let errorMessage: string;
		let stackTrace: string | undefined;
		let errorCode: string | undefined;

		if (message instanceof Error) {
			errorMessage = message.message;
			stackTrace = message.stack;
			errorCode = message.name;
		} else if (typeof message === "string") {
			errorMessage = message;
			stackTrace = metadata?.stackTrace;
			errorCode = metadata?.errorCode;
		} else {
			errorMessage = JSON.stringify(message);
			stackTrace = metadata?.stackTrace;
			errorCode = metadata?.errorCode;
		}

		const entry: LogEntry = {
			level: "error",
			message: errorMessage,
			timestamp: new Date().toISOString(),
			stackTrace,
			errorCode,
			...metadata,
		};

		// In development: use Pino
		if (!isProduction) {
			this.logWithPino("error", errorMessage, {
				...metadata,
				stackTrace,
				errorCode,
				originalError: message instanceof Error ? message : undefined,
			});
			return;
		}

		// In production: only database
		this.logToDatabase(entry);
		analytics.trackError(errorCode || "", errorMessage || "");
	}

	debug(message: string | any, metadata?: Partial<LogEntry>): void {
		let logMessage: string;
		let logMetadata: Partial<LogEntry> | undefined;

		if (typeof message === "string") {
			logMessage = message;
			logMetadata = metadata;
		} else {
			logMessage = JSON.stringify(message);
			logMetadata = { ...metadata, metadata: message };
		}

		const entry: LogEntry = {
			level: "debug",
			message: logMessage,
			timestamp: new Date().toISOString(),
			...logMetadata,
		};

		// In development: use Pino
		if (!isProduction) {
			this.logWithPino("debug", logMessage, logMetadata);
			return;
		}

		// In production: only database
		this.logToDatabase(entry);
	}

	log(level: string, message: string, metadata?: Partial<LogEntry>): void {
		switch (level) {
			case "error":
				this.error(message, metadata);
				break;
			case "warn":
				this.warn(message, metadata);
				break;
			case "debug":
				this.debug(message, metadata);
				break;
			default:
				this.info(message, metadata);
		}
	}

	// Create a child logger with additional context
	child(context: Partial<LogEntry> & Record<string, any>): Logger {
		const childLogger = new Logger({
			service: this.service,
			environment: this.environment,
			version: this.version,
		});

		// Override the logToDatabase method to include context
		const originalLogToDatabase = childLogger.logToDatabase.bind(childLogger);
		childLogger.logToDatabase = async (entry: LogEntry) => {
			// Filter out non-LogEntry properties and put them in metadata
			const logEntryProps = [
				"level",
				"message",
				"timestamp",
				"service",
				"environment",
				"version",
				"requestId",
				"userId",
				"sessionId",
				"ip",
				"userAgent",
				"url",
				"method",
				"statusCode",
				"duration",
				"errorCode",
				"stackTrace",
				"metadata",
				"tags",
				"source",
				"module",
				"line",
				"column",
			];

			const logContext: Partial<LogEntry> = {};
			const metadataContext: Record<string, any> = {};

			Object.entries(context).forEach(([key, value]) => {
				if (logEntryProps.includes(key)) {
					logContext[key as keyof LogEntry] = value;
				} else {
					metadataContext[key] = value;
				}
			});

			const entryWithContext: LogEntry = {
				...logContext,
				...entry,
				metadata: {
					...metadataContext,
					...(entry.metadata || {}),
				},
			};

			await originalLogToDatabase(entryWithContext);
		};

		// Override the logWithPino method to include context
		const originalLogWithPino = childLogger.logWithPino.bind(childLogger);
		childLogger.logWithPino = (
			level: string,
			message: string,
			metadata?: any,
		) => {
			const contextData = {
				...context,
				...metadata,
			};
			originalLogWithPino(level, message, contextData);
		};

		return childLogger;
	}
}

// Create default logger instance
const logger = new Logger({
	service: "web",
	environment: process.env.NODE_ENV,
	version: process.env.npm_package_version,
});

export default logger;
