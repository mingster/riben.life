import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { z } from "zod";

// Validation schema for incoming logs
const LogEntrySchema = z.object({
	level: z.enum(["error", "warn", "info", "debug"]),
	message: z.string().max(4000),
	service: z.string().max(100).optional(),
	environment: z.string().max(20).optional(),
	version: z.string().max(50).optional(),
	requestId: z.string().max(100).optional(),
	userId: z.string().max(100).optional(),
	sessionId: z.string().max(100).optional(),
	ip: z.string().max(45).optional(),
	userAgent: z.string().max(500).optional(),
	url: z.string().max(1000).optional(),
	method: z.string().max(10).optional(),
	statusCode: z.number().int().min(100).max(599).optional(),
	duration: z.number().int().min(0).optional(),
	errorCode: z.string().max(100).optional(),
	stackTrace: z.string().optional(),
	metadata: z.any().optional(),
	tags: z.array(z.string()).max(50).optional(),
	source: z.string().max(100).optional(),
	line: z.number().int().min(1).optional(),
	column: z.number().int().min(1).optional(),
});

const BatchLogSchema = z.object({
	logs: z.array(LogEntrySchema).max(100), // Limit batch size
});

export async function POST(request: NextRequest) {
	// Read the body as text first so we can log it if there's an error
	let rawBody = "";
	let body: any;

	try {
		rawBody = await request.text();
		body = JSON.parse(rawBody);

		// Validate the request body
		const validatedData = BatchLogSchema.parse(body);

		// Process each log entry
		const logPromises = validatedData.logs.map(async (logEntry) => {
			try {
				// Log using Winston logger
				logger.log(logEntry.level, logEntry.message, {
					service: logEntry.service,
					environment: logEntry.environment,
					version: logEntry.version,
					requestId: logEntry.requestId,
					userId: logEntry.userId,
					sessionId: logEntry.sessionId,
					ip: logEntry.ip,
					userAgent: logEntry.userAgent,
					url: logEntry.url,
					method: logEntry.method,
					statusCode: logEntry.statusCode,
					duration: logEntry.duration,
					errorCode: logEntry.errorCode,
					stackTrace: logEntry.stackTrace,
					metadata: logEntry.metadata,
					tags: logEntry.tags,
					source: logEntry.source,
					line: logEntry.line,
					column: logEntry.column,
				});
				return { success: true };
			} catch (error) {
				console.error("Failed to process log entry:", error);
				return { success: false, error: "Failed to process log entry" };
			}
		});

		const results = await Promise.allSettled(logPromises);

		// Count successful and failed logs
		const successful = results.filter(
			(result) => result.status === "fulfilled" && result.value.success,
		).length;
		const failed = results.length - successful;

		return NextResponse.json({
			success: true,
			message: `Processed ${results.length} logs`,
			results: {
				total: results.length,
				successful,
				failed,
			},
		});
	} catch (error) {
		// Log the error with the raw body we captured earlier
		logger.error("Log drain API error", {
			source: "log-drain-api",
			metadata: {
				body: rawBody || "Unable to read body",
				headers: Object.fromEntries(request.headers.entries()),
				error: error instanceof Error ? error.message : String(error),
			},
		});

		return NextResponse.json(
			{
				success: false,
				error: "Invalid log format",
				details:
					error instanceof z.ZodError ? error.issues : (error as Error).message,
			},
			{ status: 400 },
		);
	}
}

export async function GET(request: NextRequest) {
	// Health check endpoint
	return NextResponse.json({
		status: "healthy",
		service: "log-drain",
		timestamp: new Date().toISOString(),
	});
}
