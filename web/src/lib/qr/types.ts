/**
 * QR Code Generator Types
 */

export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export type CornerSquareStyle = "default" | "square" | "rounded" | "dot";
export type CornerDotStyle = "default" | "square" | "rounded" | "dot";

export interface CornerSquareOptions {
	// Outer square (positioning pattern outer)
	outerStyle: CornerSquareStyle;
	outerColor?: string; // Optional, uses foreground color if not set

	// Inner square (positioning pattern inner)
	innerStyle: CornerDotStyle;
	innerColor?: string; // Optional, uses foreground color if not set
}

export interface QRCodeOptions {
	// Content
	content: string;

	// Visual Settings
	size: number;
	foregroundColor: string;
	backgroundColor: string;
	transparentBackground: boolean;

	// QR Settings
	errorCorrectionLevel: ErrorCorrectionLevel;
	margin: number; // Border width in modules

	// Corner Square Customization
	cornerSquare?: CornerSquareOptions;
}

export interface QRCodeGenerationResult {
	dataURL: string;
	blob: Blob;
}

export const ERROR_CORRECTION_LEVELS: {
	value: ErrorCorrectionLevel;
	label: string;
	description: string;
}[] = [
	{
		value: "L",
		label: "L - Low",
		description: "7% recovery capacity",
	},
	{
		value: "M",
		label: "M - Medium",
		description: "15% recovery capacity",
	},
	{
		value: "Q",
		label: "Q - Quartile",
		description: "25% recovery capacity",
	},
	{
		value: "H",
		label: "H - High",
		description: "30% recovery capacity",
	},
];
