import { NextResponse } from "next/server";
import { z } from "zod";
import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import {
	deleteProductImageFromS3,
	getS3ErrorDiagnostics,
	isAllowedStoreVideoRawUploadContentType,
	isProductImagesS3Configured,
	uploadStoreHomeVideoBuffer,
} from "@/lib/product-images/s3-storage";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

const videoJsonUploadSchema = z.object({
	base64: z.string().min(1),
	mimeType: z.string().max(128).optional().nullable(),
});

function stripDataUrlBase64(input: string): string {
	const t = input.trim();
	const comma = t.indexOf(",");
	if (t.startsWith("data:") && comma !== -1) {
		return t.slice(comma + 1);
	}
	return t;
}

function extractS3KeyFromPublicUrl(url: string): string | null {
	const trimmed = url.trim();
	if (!trimmed) {
		return null;
	}

	try {
		const parsed = new URL(trimmed);
		const base = process.env.PRODUCT_IMAGES_PUBLIC_BASE_URL?.trim();

		if (base) {
			const baseUrl = new URL(base.endsWith("/") ? base : `${base}/`);
			if (baseUrl.origin !== parsed.origin) {
				return null;
			}
			const key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
			return key || null;
		}

		const bucket = process.env.PRODUCT_IMAGES_BUCKET?.trim();
		const region = process.env.AWS_REGION?.trim() || "ap-northeast-1";
		const expectedHost = `${bucket}.s3.${region}.amazonaws.com`;
		if (!bucket || parsed.host !== expectedHost) {
			return null;
		}
		const key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
		return key || null;
	} catch {
		return null;
	}
}

async function tryDeleteS3Object(key: string): Promise<void> {
	if (!isProductImagesS3Configured() || !key) return;
	try {
		await deleteProductImageFromS3(key);
	} catch (err: unknown) {
		logger.warn("Store home video S3 delete failed", {
			metadata: {
				key,
				error: err instanceof Error ? err.message : String(err),
			},
			tags: ["api", "s3", "store-home-video"],
		});
	}
}

export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof NextResponse) return access;

	if (!isProductImagesS3Configured()) {
		return new NextResponse("Video storage is not configured", { status: 503 });
	}

	const rawCt = req.headers.get("content-type") ?? "";
	const rawLower = rawCt.toLowerCase();
	const baseCt = rawCt.split(";")[0]?.trim().toLowerCase() ?? "";

	const isJsonUpload =
		baseCt === "application/json" || baseCt.startsWith("application/json");
	const isMultipart = rawLower.includes("multipart/form-data");
	const isRawUpload = isAllowedStoreVideoRawUploadContentType(baseCt);

	let buffer: Buffer;
	let contentType: string;

	if (isJsonUpload) {
		let jsonBody: unknown;
		try {
			jsonBody = await req.json();
		} catch {
			return new NextResponse("Invalid JSON", { status: 400 });
		}
		const parsed = videoJsonUploadSchema.safeParse(jsonBody);
		if (!parsed.success) {
			return new NextResponse(parsed.error.message, { status: 400 });
		}
		const { base64, mimeType: mimeFromJson } = parsed.data;
		const b64 = stripDataUrlBase64(base64);
		try {
			buffer = Buffer.from(b64, "base64");
		} catch {
			return new NextResponse("Invalid base64", { status: 400 });
		}
		if (!buffer.length) {
			return new NextResponse("Empty video data", { status: 400 });
		}
		contentType =
			typeof mimeFromJson === "string" && mimeFromJson.trim() !== ""
				? mimeFromJson.trim().slice(0, 128)
				: "application/octet-stream";
	} else if (isRawUpload) {
		buffer = Buffer.from(await req.arrayBuffer());
		contentType = baseCt || "application/octet-stream";
	} else if (isMultipart) {
		let form: FormData;
		try {
			form = await req.formData();
		} catch {
			return new NextResponse("Invalid form data", { status: 400 });
		}
		const file = form.get("file");
		if (!(file instanceof File)) {
			return new NextResponse("Missing file field", { status: 400 });
		}
		buffer = Buffer.from(await file.arrayBuffer());
		contentType = file.type || "application/octet-stream";
	} else {
		return new NextResponse(
			`Unsupported Content-Type (${baseCt || "missing"}). Use application/json with { base64, mimeType? }, multipart/form-data with file, application/octet-stream, or video/mp4, video/webm, video/quicktime.`,
			{ status: 415 },
		);
	}

	let uploadResult: Awaited<ReturnType<typeof uploadStoreHomeVideoBuffer>>;
	try {
		uploadResult = await uploadStoreHomeVideoBuffer({
			storeId: params.storeId,
			buffer,
			contentType,
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		const diag = getS3ErrorDiagnostics(err);
		logger.error("Store home video upload failed", {
			metadata: {
				storeId: params.storeId,
				error: message,
				s3Code: diag.code,
				s3RequestId: diag.requestId,
				s3HttpStatus: diag.httpStatusCode,
			},
			tags: ["api", "s3", "store-home-video"],
		});
		const isValidationError =
			message.includes("Allowed video") || message.includes("Video too large");
		if (isValidationError) {
			return new NextResponse(message, { status: 400 });
		}
		return new NextResponse(message, { status: 502 });
	}

	const existing = await sqlClient.storeSettings.findUnique({
		where: { storeId: params.storeId },
		select: { aboutUsVideoUrl: true },
	});
	const oldKey = extractS3KeyFromPublicUrl(existing?.aboutUsVideoUrl ?? "");

	await sqlClient.storeSettings.upsert({
		where: { storeId: params.storeId },
		create: {
			storeId: params.storeId,
			aboutUsVideoUrl: uploadResult.url,
			storefrontPickupLocationsJson: "[]",
			createdAt: getUtcNowEpoch(),
			updatedAt: getUtcNowEpoch(),
		},
		update: {
			aboutUsVideoUrl: uploadResult.url,
			updatedAt: getUtcNowEpoch(),
		},
	});

	if (oldKey && oldKey !== uploadResult.key) {
		await tryDeleteS3Object(oldKey);
	}

	logger.info("Store home video uploaded", {
		metadata: { storeId: params.storeId, key: uploadResult.key },
		tags: ["api", "store-home-video"],
	});

	return NextResponse.json({ url: uploadResult.url, key: uploadResult.key });
}

export async function DELETE(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof NextResponse) return access;

	const existing = await sqlClient.storeSettings.findUnique({
		where: { storeId: params.storeId },
		select: { aboutUsVideoUrl: true },
	});

	const oldKey = extractS3KeyFromPublicUrl(existing?.aboutUsVideoUrl ?? "");
	if (oldKey) {
		await tryDeleteS3Object(oldKey);
	}

	await sqlClient.storeSettings.update({
		where: { storeId: params.storeId },
		data: {
			aboutUsVideoUrl: "",
			updatedAt: getUtcNowEpoch(),
		},
	});

	logger.info("Store home video removed", {
		metadata: { storeId: params.storeId },
		tags: ["api", "store-home-video"],
	});

	return NextResponse.json({ ok: true });
}
