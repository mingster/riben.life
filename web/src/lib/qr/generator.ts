/**
 * QR Code Generation Logic
 */

import QRCodeStyling from "qr-code-styling";
import type { QRCodeOptions, QRCodeGenerationResult } from "./types";

/**
 * Map our corner square styles to qr-code-styling types
 */
function mapCornerSquareType(
	style: string,
): "square" | "dot" | "extra-rounded" {
	switch (style) {
		case "square":
			return "square";
		case "dot":
			return "dot";
		case "rounded":
			return "extra-rounded";
		default:
			return "square";
	}
}

/**
 * Map our corner dot styles to qr-code-styling types
 */
function mapCornerDotType(style: string): "square" | "dot" {
	switch (style) {
		case "dot":
		case "rounded":
			return "dot";
		case "square":
		default:
			return "square";
	}
}

/**
 * Generates a QR code with custom styling including corner squares
 */
export async function generateQRCode(
	options: QRCodeOptions,
): Promise<QRCodeGenerationResult> {
	const {
		content,
		size,
		foregroundColor,
		backgroundColor,
		transparentBackground,
		errorCorrectionLevel,
		margin,
		cornerSquare,
	} = options;

	// Create QR code with advanced styling
	const qrCode = new QRCodeStyling({
		width: size,
		height: size,
		data: content,
		margin: margin,
		qrOptions: {
			errorCorrectionLevel: errorCorrectionLevel,
		},
		dotsOptions: {
			color: foregroundColor,
			type: "square", // Can be extended later for dot styles
		},
		backgroundOptions: {
			color: transparentBackground ? "transparent" : backgroundColor,
		},
		cornersSquareOptions:
			cornerSquare && cornerSquare.outerStyle !== "default"
				? {
						type: mapCornerSquareType(cornerSquare.outerStyle),
						color: cornerSquare.outerColor || foregroundColor,
					}
				: {
						type: "square",
						color: foregroundColor,
					},
		cornersDotOptions:
			cornerSquare && cornerSquare.innerStyle !== "default"
				? {
						type: mapCornerDotType(cornerSquare.innerStyle),
						color: cornerSquare.innerColor || foregroundColor,
					}
				: {
						type: "square",
						color: foregroundColor,
					},
	});

	// Get the raw data
	const rawData = await qrCode.getRawData("png");
	if (!rawData) {
		throw new Error("Failed to generate QR code");
	}

	// Ensure we have a Blob
	let blob: Blob;
	if (rawData instanceof Blob) {
		blob = rawData;
	} else {
		// Convert Buffer to Blob
		const buffer = rawData;
		const arrayBuffer = buffer.buffer.slice(
			buffer.byteOffset,
			buffer.byteOffset + buffer.byteLength,
		) as ArrayBuffer;
		blob = new Blob([arrayBuffer], { type: "image/png" });
	}

	// Convert blob to data URL
	const dataURL = await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});

	return {
		dataURL,
		blob,
	};
}

/**
 * Download QR code as a file
 */
export function downloadQRCode(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * Validates URL format
 */
export function isValidURL(url: string): boolean {
	if (!url || url.trim() === "") return false;

	try {
		const urlObj = new URL(url);
		return urlObj.protocol === "http:" || urlObj.protocol === "https:";
	} catch {
		return false;
	}
}

/**
 * Ensures URL has protocol
 */
export function normalizeURL(url: string): string {
	const trimmed = url.trim();
	if (!trimmed) return "";

	// Check if it already has a protocol
	if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
		return trimmed;
	}

	// Add https:// by default
	return `https://${trimmed}`;
}
