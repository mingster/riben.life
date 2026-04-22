import { NextResponse } from "next/server";
import { z } from "zod";
import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import {
	deleteProductImageFromS3,
	getS3ErrorDiagnostics,
	isAllowedLogoRawUploadContentType,
	isProductImagesS3Configured,
	uploadLogoBuffer,
} from "@/lib/product-images/s3-storage";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

const logoJsonUploadSchema = z.object({
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

async function tryDeleteS3Object(key: string): Promise<void> {
	if (!isProductImagesS3Configured() || !key) return;
	try {
		await deleteProductImageFromS3(key);
	} catch (err: unknown) {
		logger.warn("Logo S3 delete failed", {
			metadata: {
				key,
				error: err instanceof Error ? err.message : String(err),
			},
			tags: ["api", "s3", "logo"],
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
		return new NextResponse("Logo storage is not configured", { status: 503 });
	}

	const rawCt = req.headers.get("content-type") ?? "";
	const rawLower = rawCt.toLowerCase();
	const baseCt = rawCt.split(";")[0]?.trim().toLowerCase() ?? "";

	const isJsonUpload =
		baseCt === "application/json" || baseCt.startsWith("application/json");
	const isMultipart = rawLower.includes("multipart/form-data");
	const isRawUpload = isAllowedLogoRawUploadContentType(baseCt);

	let buffer: Buffer;
	let contentType: string;

	if (isJsonUpload) {
		let jsonBody: unknown;
		try {
			jsonBody = await req.json();
		} catch {
			return new NextResponse("Invalid JSON", { status: 400 });
		}
		const parsed = logoJsonUploadSchema.safeParse(jsonBody);
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
			return new NextResponse("Empty image data", { status: 400 });
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
			`Unsupported Content-Type (${baseCt || "missing"}). Use application/json with { base64, mimeType? } (same as product images when proxies coerce JSON), multipart/form-data with file, application/octet-stream, or image/jpeg/png/webp/gif.`,
			{ status: 415 },
		);
	}

	let uploadResult: Awaited<ReturnType<typeof uploadLogoBuffer>>;
	try {
		uploadResult = await uploadLogoBuffer({
			storeId: params.storeId,
			buffer,
			contentType,
		});
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		const diag = getS3ErrorDiagnostics(err);
		logger.error("Logo upload failed", {
			metadata: {
				storeId: params.storeId,
				error: message,
				s3Code: diag.code,
				s3RequestId: diag.requestId,
				s3HttpStatus: diag.httpStatusCode,
			},
			tags: ["api", "s3", "logo"],
		});

		const isValidationError =
			message.includes("Allowed logo") || message.includes("Logo too large");
		if (isValidationError) {
			return new NextResponse(message, { status: 400 });
		}

		const accessDenied =
			diag.code === "AccessDenied" ||
			/AccessDenied|Access Denied|not authorized|Forbidden/i.test(message);
		const hint = accessDenied
			? " IAM must allow s3:PutObject (and DeleteObject) on object keys under `{prefix}stores/*` as well as `products/*` (see doc/dev_op/SETUP-AMAZON-S3.md). Bucket policy for public URLs must include the same `stores/*` prefix if logos are loaded directly from S3."
			: "";
		return new NextResponse(`${message}${hint}`, { status: 502 });
	}
	const existing = await sqlClient.store.findUnique({
		where: { id: params.storeId },
		select: { logoPublicId: true },
	});
	const oldKey = existing?.logoPublicId ?? "";

	await sqlClient.store.update({
		where: { id: params.storeId },
		data: {
			logo: uploadResult.url,
			logoPublicId: uploadResult.key,
			updatedAt: getUtcNowEpoch(),
		},
	});

	if (oldKey && oldKey !== uploadResult.key) {
		await tryDeleteS3Object(oldKey);
	}

	logger.info("Logo uploaded", {
		metadata: { storeId: params.storeId, key: uploadResult.key },
		tags: ["api", "logo"],
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

	const existing = await sqlClient.store.findUnique({
		where: { id: params.storeId },
		select: { logoPublicId: true },
	});

	if (existing?.logoPublicId) {
		await tryDeleteS3Object(existing.logoPublicId);
	}

	await sqlClient.store.update({
		where: { id: params.storeId },
		data: { logo: "", logoPublicId: "", updatedAt: getUtcNowEpoch() },
	});

	logger.info("Logo removed", {
		metadata: { storeId: params.storeId },
		tags: ["api", "logo"],
	});

	return NextResponse.json({ ok: true });
}
