"use server";

import logger from "@/lib/logger";

/**
 * Mitake SMS API
 * Based on Mitake HTTP API documentation
 */

export interface SmSendParams {
	phoneNumber: string; // Destination phone number (e.g., "0912345678" or "+886912345678")
	message: string; // SMS message content
	dlvtime?: string; // Optional: Delivery time (YYYYMMDDHHmmss format)
}

export interface SmSendResult {
	success: boolean;
	messageId?: string;
	error?: string;
	statusCode?: string;
	statusMessage?: string;
}

/**
 * Send SMS via Mitake SMS API
 *
 * doc: /doc/references/mitake-SMS/
 *
 * @param params - SMS sending parameters
 * @returns Result object with success status and message ID
 */
export async function SmSend(params: SmSendParams): Promise<SmSendResult> {
	const { phoneNumber, message, dlvtime } = params;

	// Validate required environment variables
	const username = process.env.MITAKE_SMS_USERNAME;
	const password = process.env.MITAKE_SMS_PASSWORD;

	//const apiUrl = process.env.MITAKE_SMS_API_URL || "https://api.mitake.com.tw/SmSendGet.asp";
	const apiUrl = `https://${process.env.MITAKE_SERVER}/api/mtk/SmSend?CharsetURL=UTF-8`;

	if (!username || !password) {
		const errorMessage =
			"MITAKE_SMS_USERNAME and MITAKE_SMS_PASSWORD environment variables are required";
		logger.error("Mitake SMS configuration missing", {
			metadata: {
				error: errorMessage,
			},
			tags: ["mitake", "sms", "error"],
		});
		return {
			success: false,
			error: errorMessage,
		};
	}

	// Validate phone number format
	// Convert international format (+886912345678) to local format (0912345678)
	let formattedPhone = phoneNumber.replace(/^\+886/, "0");
	// Remove any non-digit characters except leading +
	formattedPhone = formattedPhone.replace(/[^\d]/g, "");

	if (!formattedPhone || formattedPhone.length < 10) {
		const errorMessage = "Invalid phone number format";
		logger.error("Mitake SMS invalid phone number", {
			metadata: {
				phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, "*"), // Mask phone number
				formattedPhone: formattedPhone.replace(/\d(?=\d{4})/g, "*"),
				error: errorMessage,
			},
			tags: ["mitake", "sms", "error"],
		});
		return {
			success: false,
			error: errorMessage,
		};
	}

	// Validate message length (Mitake typically supports up to 70 characters for single SMS)
	if (!message || message.trim().length === 0) {
		const errorMessage = "Message cannot be empty";
		logger.error("Mitake SMS empty message", {
			metadata: {
				error: errorMessage,
			},
			tags: ["mitake", "sms", "error"],
		});
		return {
			success: false,
			error: errorMessage,
		};
	}

	try {
		// Prepare request parameters
		const requestParams = new URLSearchParams({
			username,
			password,
			dstaddr: formattedPhone,
			smbody: message,
		});

		// Add optional delivery time if provided
		if (dlvtime) {
			requestParams.append("dlvtime", dlvtime);
		}

		// Send HTTP POST request to Mitake API
		const response = await fetch(apiUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: requestParams.toString(),
		});

		if (!response.ok) {
			const errorText = await response.text();
			logger.error("Mitake SMS API request failed", {
				metadata: {
					status: response.status,
					statusText: response.statusText,
					error: errorText,
					phoneNumber: formattedPhone.replace(/\d(?=\d{4})/g, "*"),
				},
				tags: ["mitake", "sms", "error"],
			});
			return {
				success: false,
				error: `API request failed: ${response.status} ${response.statusText}`,
				statusCode: response.status.toString(),
				statusMessage: response.statusText,
			};
		}

		// Parse response
		const responseText = await response.text();

		logger.info("Mitake SMS API response", {
			metadata: {
				responseText: responseText,
			},
			tags: ["mitake", "sms", "response"],
		});

		// Mitake API can return response in two formats:
		// 1. URL-encoded: statuscode=0&statusstr=OK&msgid=1234567890
		// 2. Line-separated: [1]\r\nmsgid=2028842046\r\nstatuscode=1\r\nAccountPoint=299\r\n\r\n
		let statusCode: string | null = null;
		let statusStr: string = "";
		let msgid: string = "";

		// Try parsing as URL-encoded first
		try {
			const responseParams = new URLSearchParams(responseText);
			statusCode = responseParams.get("statuscode");
			statusStr = responseParams.get("statusstr") || "";
			msgid = responseParams.get("msgid") || "";
		} catch {
			// If URL-encoded parsing fails, try line-separated format
		}

		// If URL-encoded parsing didn't work, parse line-separated format
		if (!statusCode && !msgid) {
			const lines = responseText.split(/\r?\n/);
			for (const line of lines) {
				// Skip empty lines and array markers like [1]
				if (!line.trim() || line.trim().startsWith("[")) {
					continue;
				}

				// Parse key=value pairs
				const match = line.match(/^([^=]+)=(.*)$/);
				if (match) {
					const key = match[1].trim();
					const value = match[2].trim();

					if (key === "statuscode") {
						statusCode = value;
					} else if (key === "statusstr") {
						statusStr = value;
					} else if (key === "msgid") {
						msgid = value;
					}
				}
			}
		}

		// If we still couldn't parse the response, log it and return error
		if (!statusCode) {
			logger.error("Mitake SMS API response parsing failed", {
				metadata: {
					phoneNumber: formattedPhone.replace(/\d(?=\d{4})/g, "*"),
					response: responseText,
					responseLength: responseText.length,
					firstChars: responseText.substring(0, 200),
				},
				tags: ["mitake", "sms", "error"],
			});

			return {
				success: false,
				error: `Failed to parse API response. Response: ${responseText.substring(0, 200)}`,
				statusMessage: `Unexpected response format: ${responseText.substring(0, 200)}`,
			};
		}

		// Status code mapping:
		// 0: 預約傳送中 (Scheduled sending)
		// 1: 已送達業者 (Delivered to carrier)
		// 2: 已送達業者 (Delivered to carrier)
		// 4: 已送達手機 (Delivered to phone)
		// 5: 內容有錯誤 (Content error)
		// 6: 門號有錯誤 (Phone number error)
		// 7: 簡訊已停用 (SMS disabled)
		// 8: 逾時無送達 (Timeout, not delivered)
		// 9: 預約已取消 (Scheduled cancelled)
		// Status codes 0-4 are considered success
		const statusCodeNum = parseInt(statusCode, 10);
		const isSuccess = statusCodeNum >= 0 && statusCodeNum <= 4;

		if (isSuccess) {
			logger.info("Mitake SMS sent successfully", {
				metadata: {
					messageId: msgid,
					phoneNumber: formattedPhone.replace(/\d(?=\d{4})/g, "*"),
					statusCode,
					statusMessage: statusStr,
					response: responseText,
					messageLength: message.length,
					message: message,
				},
				tags: ["mitake", "sms", "success"],
			});

			return {
				success: true,
				messageId: msgid,
				statusCode: statusCode ?? undefined,
				statusMessage: statusStr,
			};
		} else {
			// Status code indicates error (5-9)
			// Validate statusCode is a valid number string
			const statusCodeNum = parseInt(statusCode, 10);
			const isValidStatusCode = !isNaN(statusCodeNum);

			logger.error("Mitake SMS API returned error", {
				metadata: {
					statusCode,
					statusCodeNum: isValidStatusCode ? statusCodeNum : null,
					statusMessage: statusStr,
					phoneNumber: formattedPhone.replace(/\d(?=\d{4})/g, "*"),
					response: responseText,
					responseLength: responseText.length,
					messageLength: message.length,
					message: message,
					isValidStatusCode,
				},
				tags: ["mitake", "sms", "error"],
			});

			// Create a more descriptive error message
			const errorMessage = statusStr
				? `Mitake SMS error: ${statusStr} (status code: ${statusCode})`
				: `Mitake SMS API error: status code ${statusCode || "unknown"}. Response: ${responseText.substring(0, 200)}`;

			return {
				success: false,
				error: errorMessage,
				statusCode: statusCode ?? undefined,
				statusMessage: statusStr,
			};
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("Mitake SMS send failed", {
			metadata: {
				error: errorMessage,
				phoneNumber: formattedPhone.replace(/\d(?=\d{4})/g, "*"),
				stack: error instanceof Error ? error.stack : undefined,
			},
			tags: ["mitake", "sms", "error"],
		});

		return {
			success: false,
			error: errorMessage,
		};
	}
}
