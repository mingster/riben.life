import { randomUUID } from "node:crypto";
import {
	DeleteObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";

const MAX_BYTES_IMAGE = 10 * 1024 * 1024; // 10 MB — raster / GIF
const MAX_BYTES_MODEL = 50 * 1024 * 1024; // 50 MB — GLB / FBX

const MODEL_EXTENSIONS = new Set(["glb", "fbx"]);

const ALLOWED_TYPES: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"image/gif": "gif",
	"model/gltf-binary": "glb",
	"model/fbx": "fbx",
	"application/vnd.autodesk.fbx": "fbx",
};

/** True when `Content-Type` may use a raw body (plus `application/octet-stream` for sniffing). */
export function isAllowedRawUploadContentType(baseCt: string): boolean {
	const ct = baseCt.toLowerCase();
	if (ct === "application/octet-stream") {
		return true;
	}
	return Boolean(ALLOWED_TYPES[ct]);
}

/** Infer MIME from magic bytes when the client sends empty or `application/octet-stream`. */
export function sniffImageMimeFromBuffer(buffer: Buffer): string | null {
	if (buffer.length < 12) {
		return null;
	}
	// GLB / glTF binary: magic "glTF" at bytes 0–3 (little-endian word 0x46546C67)
	if (
		buffer[0] === 0x67 &&
		buffer[1] === 0x6c &&
		buffer[2] === 0x54 &&
		buffer[3] === 0x46
	) {
		return "model/gltf-binary";
	}
	// GIF
	if (
		buffer[0] === 0x47 &&
		buffer[1] === 0x49 &&
		buffer[2] === 0x46 &&
		buffer[3] === 0x38 &&
		(buffer[4] === 0x37 || buffer[4] === 0x39) &&
		buffer[5] === 0x61
	) {
		return "image/gif";
	}
	// PNG
	if (
		buffer[0] === 0x89 &&
		buffer[1] === 0x50 &&
		buffer[2] === 0x4e &&
		buffer[3] === 0x47
	) {
		return "image/png";
	}
	// JPEG
	if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
		return "image/jpeg";
	}
	// WebP: RIFF .... WEBP
	if (
		buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
		buffer.subarray(8, 12).toString("ascii") === "WEBP"
	) {
		return "image/webp";
	}
	// FBX binary (Kaydara)
	if (buffer.length >= 18) {
		const kaydara = buffer.subarray(0, 18).toString("ascii");
		if (kaydara === "Kaydara FBX Binary") {
			return "model/fbx";
		}
	}
	// FBX ASCII
	if (buffer.length >= 6) {
		const head = buffer.subarray(0, 20).toString("ascii");
		if (head.startsWith("; FBX") || head.startsWith("FBX")) {
			return "model/fbx";
		}
	}
	return null;
}

function maxBytesForExtension(ext: string): number {
	return MODEL_EXTENSIONS.has(ext) ? MAX_BYTES_MODEL : MAX_BYTES_IMAGE;
}

export function isProductImagesS3Configured(): boolean {
	return Boolean(process.env.PRODUCT_IMAGES_BUCKET?.trim());
}

function getBucket(): string {
	const b = process.env.PRODUCT_IMAGES_BUCKET?.trim();
	if (!b) {
		throw new Error("PRODUCT_IMAGES_BUCKET is not set");
	}
	return b;
}

function getKeyPrefix(): string {
	const p = process.env.PRODUCT_IMAGES_KEY_PREFIX?.trim() ?? "";
	if (!p) return "";
	return p.endsWith("/") ? p : `${p}/`;
}

export function buildObjectKey(
	productId: string,
	imageId: string,
	extension: string,
): string {
	const safeExt = extension.replace(/^\./, "").toLowerCase();
	const prefix = getKeyPrefix();
	return `${prefix}products/${productId}/${imageId}.${safeExt}`;
}

/** Encode each path segment for use in a URL path after the hostname. */
export function encodeS3KeyForUrlPath(key: string): string {
	return key
		.split("/")
		.filter(Boolean)
		.map((segment) => encodeURIComponent(segment))
		.join("/");
}

/**
 * Public object URL: virtual-hosted S3 style, or PRODUCT_IMAGES_PUBLIC_BASE_URL + key (MinIO / CDN).
 */
export function buildPublicObjectUrl(
	bucket: string,
	region: string,
	key: string,
): string {
	const base = process.env.PRODUCT_IMAGES_PUBLIC_BASE_URL?.trim();
	const encodedPath = encodeS3KeyForUrlPath(key);
	if (base) {
		const root = base.replace(/\/$/, "");
		return `${root}/${encodedPath}`;
	}
	return `https://${bucket}.s3.${region}.amazonaws.com/${encodedPath}`;
}

/** Fields from @aws-sdk / Smithy service errors for logs and operator hints. */
export function getS3ErrorDiagnostics(err: unknown): {
	message: string;
	code?: string;
	requestId?: string;
	httpStatusCode?: number;
} {
	const message = err instanceof Error ? err.message : String(err);
	if (!err || typeof err !== "object") {
		return { message };
	}
	const e = err as {
		name?: string;
		$metadata?: { httpStatusCode?: number; requestId?: string };
	};
	const requestId = e.$metadata?.requestId;
	const httpStatusCode = e.$metadata?.httpStatusCode;
	const code = typeof e.name === "string" ? e.name : undefined;
	return { message, code, requestId, httpStatusCode };
}

function createS3Client(): S3Client {
	const region = process.env.AWS_REGION?.trim() || "ap-northeast-1";
	const endpoint = process.env.AWS_S3_ENDPOINT?.trim();
	const forcePathStyle =
		process.env.AWS_S3_FORCE_PATH_STYLE === "true" ||
		process.env.AWS_S3_FORCE_PATH_STYLE === "1";

	return new S3Client({
		region,
		...(endpoint ? { endpoint, forcePathStyle } : {}),
	});
}

const LOGO_ALLOWED_TYPES: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/jpg": "jpg", // some clients send this non-standard type
	"image/png": "png",
	"image/webp": "webp",
	"image/gif": "gif",
};

const STORE_VIDEO_ALLOWED_TYPES: Record<string, string> = {
	"video/mp4": "mp4",
	"video/webm": "webm",
	"video/quicktime": "mov",
};

const MAX_BYTES_STORE_VIDEO = 80 * 1024 * 1024; // 80MB

/** Raw-body logo POST (same idea as product image `application/octet-stream` + sniff). No models. */
export function isAllowedLogoRawUploadContentType(baseCt: string): boolean {
	const ct = baseCt.toLowerCase().trim();
	if (ct === "application/octet-stream") {
		return true;
	}
	return Boolean(LOGO_ALLOWED_TYPES[ct]);
}

/** S3 key for store logos — IAM / bucket policies must allow this path (see SETUP-AMAZON-S3.md). */
export function buildLogoKey(storeId: string, ext: string): string {
	const safeExt = ext.replace(/^\./, "").toLowerCase();
	const prefix = getKeyPrefix();
	return `${prefix}stores/${storeId}/logo/${randomUUID()}.${safeExt}`;
}

export interface UploadLogoResult {
	key: string;
	url: string;
}

/** Raw-body store video POST (`application/octet-stream` or an allowed video content type). */
export function isAllowedStoreVideoRawUploadContentType(
	baseCt: string,
): boolean {
	const ct = baseCt.toLowerCase().trim();
	if (ct === "application/octet-stream") {
		return true;
	}
	return Boolean(STORE_VIDEO_ALLOWED_TYPES[ct]);
}

/** S3 key for store home background videos. */
export function buildStoreHomeVideoKey(storeId: string, ext: string): string {
	const safeExt = ext.replace(/^\./, "").toLowerCase();
	const prefix = getKeyPrefix();
	return `${prefix}stores/${storeId}/background-video/${randomUUID()}.${safeExt}`;
}

export interface UploadStoreHomeVideoResult {
	key: string;
	url: string;
}

export async function uploadStoreHomeVideoBuffer(params: {
	storeId: string;
	buffer: Buffer;
	contentType: string;
}): Promise<UploadStoreHomeVideoResult> {
	const { storeId, buffer, contentType: rawType } = params;
	const contentType = rawType.trim().toLowerCase();
	const ext = STORE_VIDEO_ALLOWED_TYPES[contentType];

	if (!ext) {
		throw new Error("Allowed video types: MP4, WebM, QuickTime");
	}
	if (buffer.length > MAX_BYTES_STORE_VIDEO) {
		throw new Error(
			`Video too large (max ${MAX_BYTES_STORE_VIDEO / (1024 * 1024)} MB)`,
		);
	}

	const bucket = getBucket();
	const region = process.env.AWS_REGION?.trim() || "ap-northeast-1";
	const key = buildStoreHomeVideoKey(storeId, ext);
	const client = createS3Client();

	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: buffer,
			ContentType: contentType,
			CacheControl: "public, max-age=31536000, immutable",
		}),
	);

	const url = buildPublicObjectUrl(bucket, region, key);
	return { key, url };
}

export async function uploadLogoBuffer(params: {
	storeId: string;
	buffer: Buffer;
	contentType: string;
}): Promise<UploadLogoResult> {
	const { storeId, buffer, contentType: rawType } = params;
	let contentType = rawType.trim().toLowerCase();
	if (
		!contentType ||
		contentType === "application/octet-stream" ||
		!LOGO_ALLOWED_TYPES[contentType]
	) {
		const sniffed = sniffImageMimeFromBuffer(buffer);
		if (sniffed && LOGO_ALLOWED_TYPES[sniffed]) {
			contentType = sniffed;
		}
	}
	const ext = LOGO_ALLOWED_TYPES[contentType];
	if (!ext) {
		throw new Error("Allowed logo types: JPEG, PNG, WebP, GIF");
	}
	if (buffer.length > MAX_BYTES_IMAGE) {
		throw new Error(
			`Logo too large (max ${MAX_BYTES_IMAGE / (1024 * 1024)} MB)`,
		);
	}

	const bucket = getBucket();
	const region = process.env.AWS_REGION?.trim() || "ap-northeast-1";
	const key = buildLogoKey(storeId, ext);
	const client = createS3Client();

	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: buffer,
			ContentType: contentType,
			CacheControl: "public, max-age=31536000, immutable",
		}),
	);

	const url = buildPublicObjectUrl(bucket, region, key);
	return { key, url };
}

export interface UploadProductImageResult {
	key: string;
	url: string;
	imageId: string;
	extension: string;
	contentType: string;
}

/**
 * Validates MIME type and size, uploads to S3, returns key and public URL.
 */
export async function uploadProductImageBuffer(params: {
	productId: string;
	buffer: Buffer;
	contentType: string;
}): Promise<UploadProductImageResult> {
	const { productId, buffer, contentType: rawType } = params;
	let contentType = rawType.trim().toLowerCase();
	if (
		!contentType ||
		contentType === "application/octet-stream" ||
		!ALLOWED_TYPES[contentType]
	) {
		const sniffed = sniffImageMimeFromBuffer(buffer);
		if (sniffed) {
			contentType = sniffed;
		}
	}
	const ext = ALLOWED_TYPES[contentType];
	if (!ext) {
		throw new Error(
			"Allowed types: JPEG, PNG, WebP, GIF, GLB (model/gltf-binary), FBX",
		);
	}
	const maxBytes = maxBytesForExtension(ext);
	if (buffer.length > maxBytes) {
		throw new Error(
			`File too large (max ${maxBytes / (1024 * 1024)} MB for .${ext})`,
		);
	}

	const bucket = getBucket();
	const region = process.env.AWS_REGION?.trim() || "ap-northeast-1";
	const imageId = randomUUID();
	const key = buildObjectKey(productId, imageId, ext);
	const client = createS3Client();

	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: buffer,
			ContentType: contentType,
			CacheControl: "public, max-age=31536000, immutable",
		}),
	);

	const url = buildPublicObjectUrl(bucket, region, key);
	return { key, url, imageId, extension: ext, contentType };
}

export async function deleteProductImageFromS3(
	objectKey: string,
): Promise<void> {
	const bucket = getBucket();
	const client = createS3Client();
	await client.send(
		new DeleteObjectCommand({
			Bucket: bucket,
			Key: objectKey,
		}),
	);
}
