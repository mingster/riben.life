"use client";

import { analytics } from "./analytics";
import logger from "@/lib/logger";

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
	line?: number;
	column?: number;
}

class ClientLogger {
	private service: string;
	private environment: string;
	private version?: string;
	private queue: LogEntry[] = [];
	private isProcessing = false;

	constructor(
		options: {
			service?: string;
			environment?: string;
			version?: string;
		} = {},
	) {
		this.service = options.service || "client";
		this.environment = options.environment || "development";
		this.version = options.version;
	}

	private async sendToServer(logEntry: LogEntry): Promise<void> {
		try {
			const response = await fetch("/api/log-write", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					logs: [logEntry],
				}),
			});

			if (!response.ok) {
				logger.error("Failed to send log to server:", {
					tags: ["error"],
				});
			}
		} catch (error) {
			logger.error("Failed to send log to server:", {
				metadata: {
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["error"],
			});
		}
	}

	private async processQueue(): Promise<void> {
		if (this.isProcessing || this.queue.length === 0) {
			return;
		}

		this.isProcessing = true;

		try {
			const batch = this.queue.splice(0, 10); // Process up to 10 logs at a time

			const response = await fetch("/api/log-write", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					logs: batch,
				}),
			});

			if (!response.ok) {
				console.error(
					"Failed to send log batch to server:",
					response.statusText,
				);
				// Put logs back in queue for retry
				this.queue.unshift(...batch);
			}
		} catch (error) {
			logger.error("Failed to send log batch to server:", {
				metadata: {
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["error"],
			});
			// Put logs back in queue for retry
			this.queue.unshift(...this.queue.splice(0, 10));
		} finally {
			this.isProcessing = false;

			// Process remaining logs
			if (this.queue.length > 0) {
				setTimeout(() => this.processQueue(), 1000);
			}
		}
	}

	private createLogEntry(
		level: LogEntry["level"],
		message: string,
		options?: Partial<LogEntry>,
	): LogEntry {
		const entry: LogEntry = {
			level,
			message,
			timestamp: new Date().toISOString(),
			service: options?.service || this.service,
			environment: options?.environment || this.environment,
			version: options?.version || this.version,
			requestId: options?.requestId,
			userId: options?.userId,
			sessionId: options?.sessionId,
			ip: options?.ip,
			userAgent:
				typeof window !== "undefined" ? window.navigator.userAgent : undefined,
			url: typeof window !== "undefined" ? window.location.href : undefined,
			method: options?.method,
			statusCode: options?.statusCode,
			duration: options?.duration,
			errorCode: options?.errorCode,
			stackTrace: options?.stackTrace,
			metadata: options?.metadata,
			tags: options?.tags,
			source: options?.source,
			line: options?.line,
			column: options?.column,
		};

		return entry;
	}

	info(message: string, options?: Partial<LogEntry> | undefined): void {
		const entry = this.createLogEntry("info", message, options);
		this.queue.push(entry);
		this.processQueue();

		// Also log to console in development
		if (this.environment === "development") {
			logger.info("info");
		}
	}

	warn(message: string, options?: Partial<LogEntry> | undefined): void {
		const entry = this.createLogEntry("warn", message, options);
		this.queue.push(entry);
		this.processQueue();

		// Also log to console
		if (this.environment === "development") {
			logger.warn("warn");
		}
	}

	error(
		message: string | Error,
		options?: Partial<LogEntry> | undefined,
	): void {
		const errorMessage = message instanceof Error ? message.message : message;
		const stackTrace =
			message instanceof Error ? message.stack : options?.stackTrace;
		const errorCode =
			message instanceof Error ? message.name : options?.errorCode;

		const entry = this.createLogEntry("error", errorMessage, {
			...options,
			stackTrace,
			errorCode,
		});

		analytics.trackError(errorCode || "", errorMessage || "");

		this.queue.push(entry);
		this.processQueue();

		// Also log to console
		if (this.environment === "development") {
			console.error(
				`[ERROR] ${errorMessage}`,
				message instanceof Error ? message : options || {},
			);
		}
	}

	debug(message: string, options?: Partial<LogEntry> | undefined): void {
		if (this.environment === "development") {
			const entry = this.createLogEntry("debug", message, options);
			this.queue.push(entry);
			this.processQueue();

			// Also log to console
			logger.info("debug");
		}
	}

	// Log user interactions
	logUserAction(action: string, options?: Partial<LogEntry>): void {
		this.info(`User action: ${action}`, {
			...options,
			tags: [...(options?.tags || []), "user-action"],
		});
	}

	// Log page views
	logPageView(page: string, options?: Partial<LogEntry>): void {
		this.info(`Page view: ${page}`, {
			...options,
			tags: [...(options?.tags || []), "page-view"],
		});
	}

	// Log errors with context
	logError(error: Error, context?: Record<string, any>): void {
		this.error(error, {
			metadata: context,
			tags: ["error", "client"],
		});
	}
}

// Filter out Fast Refresh messages from console
if (typeof window !== "undefined") {
	const originalConsoleLog = console.log;
	const originalConsoleInfo = console.info;

	// Filter function to check if message contains Fast Refresh
	const shouldFilter = (...args: any[]): boolean => {
		const message = args
			.map((arg) => {
				if (typeof arg === "string") return arg;
				if (arg?.toString) return arg.toString();
				return JSON.stringify(arg);
			})
			.join(" ");
		return /\[Fast Refresh\]/i.test(message);
	};

	// Override console.log
	console.log = (...args: any[]) => {
		if (!shouldFilter(...args)) {
			originalConsoleLog.apply(console, args);
		}
	};

	// Override console.info
	console.info = (...args: any[]) => {
		if (!shouldFilter(...args)) {
			originalConsoleInfo.apply(console, args);
		}
	};
}

// Create default client logger instance
export const clientLogger = new ClientLogger({
	service: "client",
	environment: typeof window !== "undefined" ? "development" : "production",
	version: process.env.npm_package_version,
});

export default clientLogger;
