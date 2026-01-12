/**
 * RSVP Import Parser
 * Parses text format into structured RSVP data
 */

export interface ParsedRsvpReservation {
	number: number;
	date: string; // MM/DD format
	startTime: string | null; // HH:MM format or null
	endTime: string | null; // HH:MM format or null
	year: number; // Year for this reservation
}

export interface ParsedRsvpBlock {
	customerName: string; // Combined name
	productName: string; // e.g., "網球課10H"
	totalReservations: number; // Extracted from product name (10)
	paidDate: string | null; // Parsed paid date in format "MM/DD YYYY"
	paidDateYear: number | null; // Year from paid date
	paidDateMonth: number | null; // Month from paid date
	paidDateDay: number | null; // Day from paid date
	reservations: ParsedRsvpReservation[];
}

export interface ParsedRsvpData {
	blocks: ParsedRsvpBlock[];
	errors: Array<{
		blockIndex: number;
		line: number;
		error: string;
	}>;
}

/**
 * Parse RSVP import text into structured data
 */
export function parseRsvpImportText(text: string): ParsedRsvpData {
	const lines = text.split("\n").map((line) => line.trim());
	const blocks: ParsedRsvpBlock[] = [];
	const errors: Array<{ blockIndex: number; line: number; error: string }> = [];
	let currentBlock: ParsedRsvpBlock | null = null;
	let blockIndex = 0;
	let currentYear: number | null = null;

	// Get current year as default
	const now = new Date();
	const defaultYear = now.getFullYear();

	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const line = lines[lineIndex];
		if (!line) continue; // Skip empty lines

		// Check if this is a year marker (e.g., "2026")
		const yearMatch = /^\d{4}$/.exec(line);
		if (yearMatch) {
			currentYear = parseInt(yearMatch[0], 10);
			continue;
		}

		// Check if this is a first line (customer name + product name + paid date)
		// Pattern: {name} {product name}{quantity}H（MM/DD YYYY）or {name} {product name}{quantity}H
		const firstLineMatch =
			/^(.+?)\s+([^\s]+?\d+H)[（(]?(\d{1,2}\/\d{1,2}\s+\d{4})?[）)]?$/.exec(
				line,
			);
		if (firstLineMatch) {
			// Save previous block if exists
			if (currentBlock) {
				blocks.push(currentBlock);
			}

			// Start new block
			const customerName = firstLineMatch[1].trim();
			const productName = firstLineMatch[2].trim();
			const paidDateStr = firstLineMatch[3]?.trim() || null;

			// Extract total reservations from product name (e.g., "10H" -> 10)
			const quantityMatch = /(\d+)H$/.exec(productName);
			const totalReservations = quantityMatch
				? parseInt(quantityMatch[1], 10)
				: 0;

			// Parse paid date if present
			let paidDate: string | null = null;
			let paidDateYear: number | null = null;
			let paidDateMonth: number | null = null;
			let paidDateDay: number | null = null;

			if (paidDateStr) {
				const paidDateMatch = /^(\d{1,2})\/(\d{1,2})\s+(\d{4})$/.exec(
					paidDateStr,
				);
				if (paidDateMatch) {
					paidDateMonth = parseInt(paidDateMatch[1], 10);
					paidDateDay = parseInt(paidDateMatch[2], 10);
					paidDateYear = parseInt(paidDateMatch[3], 10);
					paidDate = `${paidDateMatch[1].padStart(2, "0")}/${paidDateMatch[2].padStart(2, "0")} ${paidDateMatch[3]}`;
					currentYear = paidDateYear; // Use paid date year as default
				}
			} else {
				// If no paid date, use default year
				currentYear = defaultYear;
			}

			currentBlock = {
				customerName,
				productName,
				totalReservations,
				paidDate,
				paidDateYear,
				paidDateMonth,
				paidDateDay,
				reservations: [],
			};
			blockIndex++;
			continue;
		}

		// Check if this is a reservation line
		// Pattern: {number}- {date} {time}～{time} or {number}- (empty)
		const reservationMatch = /^(\d+)-(\s+(.+?))?$/.exec(line);
		if (reservationMatch && currentBlock) {
			const number = parseInt(reservationMatch[1], 10);
			const rest = reservationMatch[3]?.trim() || "";

			if (!rest) {
				// Empty reservation slot (e.g., "6-") - mark as recurring
				// Use current year (set by year marker or paid date)
				const year = currentYear || defaultYear;
				currentBlock.reservations.push({
					number,
					date: "", // Empty date indicates recurring
					startTime: null, // Will use time slot from previous reservation
					endTime: null,
					year,
				});
				continue;
			}

			// Parse date and time range
			// Pattern: {date} {startTime}～{endTime}
			const dateTimeMatch =
				/^(\d{1,2}\s*\/\s*\d{1,2})\s+(\d{1,2}:\d{2})～(\d{1,2}:\d{2})$/.exec(
					rest,
				);
			if (dateTimeMatch) {
				const dateStr = dateTimeMatch[1].replace(/\s+/g, "");
				const startTime = dateTimeMatch[2];
				const endTime = dateTimeMatch[3];

				// Use current year (set by year marker or paid date)
				const year = currentYear || defaultYear;

				currentBlock.reservations.push({
					number,
					date: dateStr,
					startTime,
					endTime,
					year,
				});
			} else {
				errors.push({
					blockIndex: blockIndex - 1,
					line: lineIndex + 1,
					error: `Invalid reservation format: ${line}`,
				});
			}
			continue;
		}

		// If we get here and have a current block, it might be an unexpected line
		if (currentBlock) {
			errors.push({
				blockIndex: blockIndex - 1,
				line: lineIndex + 1,
				error: `Unexpected line format: ${line}`,
			});
		}
	}

	// Save last block if exists
	if (currentBlock) {
		blocks.push(currentBlock);
	}

	return { blocks, errors };
}

import { convertToUtc, dateToEpoch } from "./datetime-utils";

/**
 * Convert parsed reservation date/time to UTC epoch milliseconds
 */
export function parseReservationDateTime(
	dateStr: string, // "MM/DD" or "M/DD"
	startTimeStr: string | null, // "HH:MM" or null
	endTimeStr: string | null, // "HH:MM" or null
	year: number,
	storeTimezone: string, // "Asia/Taipei"
): {
	rsvpTime: bigint | null; // UTC epoch milliseconds
	arriveTime: bigint | null; // UTC epoch milliseconds (same as rsvpTime if provided)
	duration: number; // Duration in minutes
} {
	if (!startTimeStr || !endTimeStr) {
		return {
			rsvpTime: null,
			arriveTime: null,
			duration: 0,
		};
	}

	// Parse date (MM/DD or M/DD)
	const dateParts = dateStr.split("/");
	if (dateParts.length !== 2) {
		throw new Error(`Invalid date format: ${dateStr}`);
	}

	const month = parseInt(dateParts[0].trim(), 10);
	const day = parseInt(dateParts[1].trim(), 10);

	// Parse times (HH:MM)
	const startParts = startTimeStr.split(":");
	if (startParts.length !== 2) {
		throw new Error(`Invalid start time format: ${startTimeStr}`);
	}
	const startHour = parseInt(startParts[0], 10);
	const startMinute = parseInt(startParts[1], 10);

	const endParts = endTimeStr.split(":");
	if (endParts.length !== 2) {
		throw new Error(`Invalid end time format: ${endTimeStr}`);
	}
	const endHour = parseInt(endParts[0], 10);
	const endMinute = parseInt(endParts[1], 10);

	// Create datetime-local string in format "YYYY-MM-DDTHH:mm"
	const dateTimeLocalStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`;
	const endDateTimeLocalStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;

	// Convert store timezone datetime to UTC Date using existing utility
	const startUtcDate = convertToUtc(dateTimeLocalStr, storeTimezone);
	const endUtcDate = convertToUtc(endDateTimeLocalStr, storeTimezone);

	// Calculate duration in minutes
	const duration =
		(endUtcDate.getTime() - startUtcDate.getTime()) / (1000 * 60);

	// Convert to BigInt epoch milliseconds
	const rsvpTime = dateToEpoch(startUtcDate);
	const arriveTime = rsvpTime; // Same as rsvpTime for completed RSVPs

	return {
		rsvpTime,
		arriveTime,
		duration: Math.round(duration),
	};
}
