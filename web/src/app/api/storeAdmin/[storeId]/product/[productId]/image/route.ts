import type { ProductImages } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import {
	deleteProductImageFromS3,
	isAllowedRawUploadContentType,
	isProductImagesS3Configured,
	uploadProductImageBuffer,
} from "@/lib/product-images/s3-storage";
import { transformPrismaDataForJson } from "@/utils/utils";

async function findOwnedImage(
	storeId: string,
	productId: string,
	imageId: string,
) {
	return sqlClient.productImages.findFirst({
		where: {
			id: imageId,
			productId,
			Product: { storeId },
		},
	});
}

async function tryDeleteS3Object(key: string): Promise<void> {
	if (!isProductImagesS3Configured()) {
		return;
	}
	try {
		await deleteProductImageFromS3(key);
	} catch (err: unknown) {
		logger.warn("Product image S3 delete failed or skipped", {
			metadata: {
				key,
				error: err instanceof Error ? err.message : String(err),
			},
			tags: ["api", "s3"],
		});
	}
}

const jsonImageUploadSchema = z.object({
	base64: z.string().min(1),
	mimeType: z.string().max(128).optional().nullable(),
	altText: z.string().max(2000).optional().nullable(),
	mediaType: z.string().max(64).optional().nullable(),
	sortOrder: z.number().int().optional(),
});

function stripDataUrlBase64(input: string): string {
	const t = input.trim();
	const comma = t.indexOf(",");
	if (t.startsWith("data:") && comma !== -1) {
		return t.slice(comma + 1);
	}
	return t;
}

function parseOptionalInt(
	value: FormDataEntryValue | null,
): number | undefined {
	if (value === null || value === "") {
		return undefined;
	}
	const s = typeof value === "string" ? value : String(value);
	const n = Number.parseInt(s, 10);
	return Number.isFinite(n) ? n : undefined;
}

/** JSON / raw / multipart: see `uploadProductImageBuffer` in s3-storage (images + GIF + GLB + FBX). */
export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string; productId: string }> },
) {
	const params = await props.params;
	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof NextResponse) {
		return access;
	}

	if (!params.productId) {
		return new NextResponse("product id is required", { status: 400 });
	}

	if (!isProductImagesS3Configured()) {
		return new NextResponse("Product image storage is not configured", {
			status: 503,
		});
	}

	const product = await sqlClient.product.findFirst({
		where: { id: params.productId, storeId: params.storeId },
		select: { id: true },
	});
	if (!product) {
		return new NextResponse("Product not found", { status: 404 });
	}

	let uploadResult: Awaited<ReturnType<typeof uploadProductImageBuffer>>;
	let altText: string | null = null;
	let mediaType = "image";
	let sortOrder: number | undefined;

	try {
		const rawCt = req.headers.get("content-type") ?? "";
		const baseCt = rawCt.split(";")[0]?.trim().toLowerCase() ?? "";

		const isMultipart = baseCt.includes("multipart/form-data");
		const isJsonUpload =
			baseCt === "application/json" || baseCt.startsWith("application/json");
		const isRawUpload = isAllowedRawUploadContentType(baseCt);

		if (isJsonUpload) {
			let jsonBody: unknown;
			try {
				jsonBody = await req.json();
			} catch {
				return new NextResponse("Invalid JSON", { status: 400 });
			}
			const parsed = jsonImageUploadSchema.safeParse(jsonBody);
			if (!parsed.success) {
				return new NextResponse(parsed.error.message, { status: 400 });
			}
			const {
				base64,
				mimeType: mimeFromJson,
				altText: altJson,
				mediaType: mediaJson,
				sortOrder: sortJson,
			} = parsed.data;
			const b64 = stripDataUrlBase64(base64);
			let buffer: Buffer;
			try {
				buffer = Buffer.from(b64, "base64");
			} catch {
				return new NextResponse("Invalid base64", { status: 400 });
			}
			if (!buffer.length) {
				return new NextResponse("Empty image data", { status: 400 });
			}
			if (typeof altJson === "string" && altJson.trim() !== "") {
				altText = altJson.trim();
			}
			if (typeof mediaJson === "string" && mediaJson.trim() !== "") {
				mediaType = mediaJson.trim().slice(0, 64);
			}
			if (sortJson !== undefined && Number.isFinite(sortJson)) {
				sortOrder = sortJson;
			}
			const contentType =
				typeof mimeFromJson === "string" && mimeFromJson.trim() !== ""
					? mimeFromJson.trim().slice(0, 128)
					: "application/octet-stream";
			uploadResult = await uploadProductImageBuffer({
				productId: params.productId,
				buffer,
				contentType,
			});
		} else if (isRawUpload) {
			const buffer = Buffer.from(await req.arrayBuffer());
			uploadResult = await uploadProductImageBuffer({
				productId: params.productId,
				buffer,
				contentType: baseCt,
			});
		} else if (isMultipart) {
			const form = await req.formData();
			const file = form.get("file");
			if (!(file instanceof File)) {
				return new NextResponse("Missing file field", { status: 400 });
			}

			const altRaw = form.get("altText");
			if (typeof altRaw === "string" && altRaw.trim() !== "") {
				altText = altRaw.trim();
			}

			const mediaRaw = form.get("mediaType");
			if (typeof mediaRaw === "string" && mediaRaw.trim() !== "") {
				mediaType = mediaRaw.trim().slice(0, 64);
			}

			sortOrder = parseOptionalInt(form.get("sortOrder"));

			const buffer = Buffer.from(await file.arrayBuffer());
			const contentType = file.type || "application/octet-stream";

			uploadResult = await uploadProductImageBuffer({
				productId: params.productId,
				buffer,
				contentType,
			});
		} else {
			return new NextResponse(
				`Unsupported Content-Type (${baseCt || "missing"}). Use application/json, multipart/form-data, application/octet-stream, or a specific allowed image/model MIME type.`,
				{ status: 415 },
			);
		}
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		logger.error("Product image upload failed", {
			metadata: {
				productId: params.productId,
				storeId: params.storeId,
				error: message,
			},
			tags: ["api", "s3"],
		});
		return new NextResponse(message, { status: 400 });
	}

	if (
		(uploadResult.extension === "glb" || uploadResult.extension === "fbx") &&
		mediaType === "image"
	) {
		mediaType = "other";
	}

	if (sortOrder === undefined) {
		const agg = await sqlClient.productImages.aggregate({
			where: { productId: params.productId },
			_max: { sortOrder: true },
		});
		sortOrder = (agg._max.sortOrder ?? -1) + 1;
	}

	let row: ProductImages;
	try {
		row = await sqlClient.productImages.create({
			data: {
				productId: params.productId,
				url: uploadResult.url,
				imgPublicId: uploadResult.key,
				sortOrder,
				altText,
				mediaType,
			},
		});
	} catch (err: unknown) {
		await tryDeleteS3Object(uploadResult.key);
		logger.error("Product image DB create failed after S3 upload", {
			metadata: {
				productId: params.productId,
				key: uploadResult.key,
				error: err instanceof Error ? err.message : String(err),
			},
			tags: ["api", "database"],
		});
		return new NextResponse("Failed to save image record", { status: 500 });
	}

	logger.info("Product image created", {
		metadata: {
			productId: params.productId,
			imageId: row.id,
		},
		tags: ["api"],
	});

	transformPrismaDataForJson(row);
	return NextResponse.json(row);
}

/**
 * Update metadata and/or reorder.
 * Body: `{ id, altText?, mediaType?, sortOrder? }` or `{ reorder: { id, sortOrder }[] }`.
 */
export async function PATCH(
	req: Request,
	props: { params: Promise<{ storeId: string; productId: string }> },
) {
	const params = await props.params;
	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof NextResponse) {
		return access;
	}

	if (!params.productId) {
		return new NextResponse("product id is required", { status: 400 });
	}

	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return new NextResponse("Invalid JSON", { status: 400 });
	}

	if (!body || typeof body !== "object") {
		return new NextResponse("Invalid body", { status: 400 });
	}

	const o = body as Record<string, unknown>;

	if (Array.isArray(o.reorder)) {
		const reorder = o.reorder as { id?: string; sortOrder?: number }[];
		if (!reorder.length) {
			return new NextResponse("reorder must be non-empty", { status: 400 });
		}
		const normalized: { id: string; sortOrder: number }[] = [];
		for (const item of reorder) {
			if (typeof item.id !== "string" || typeof item.sortOrder !== "number") {
				return new NextResponse("Invalid reorder entry", { status: 400 });
			}
			normalized.push({ id: item.id, sortOrder: item.sortOrder });
		}

		const ids = normalized.map((r) => r.id);
		const owned = await sqlClient.productImages.findMany({
			where: {
				productId: params.productId,
				id: { in: ids },
				Product: { storeId: params.storeId },
			},
			select: { id: true },
		});
		if (owned.length !== ids.length) {
			return new NextResponse("One or more images not found", { status: 404 });
		}

		await sqlClient.$transaction(
			normalized.map((r) =>
				sqlClient.productImages.update({
					where: { id: r.id },
					data: { sortOrder: r.sortOrder },
				}),
			),
		);

		const updated = await sqlClient.productImages.findMany({
			where: { productId: params.productId },
			orderBy: { sortOrder: "asc" },
		});
		transformPrismaDataForJson(updated);
		return NextResponse.json(updated);
	}

	const id = o.id;
	if (typeof id !== "string" || !id) {
		return new NextResponse("id is required", { status: 400 });
	}

	const existing = await findOwnedImage(params.storeId, params.productId, id);
	if (!existing) {
		return new NextResponse("Image not found", { status: 404 });
	}

	const data: {
		altText?: string | null;
		mediaType?: string;
		sortOrder?: number;
	} = {};

	if ("altText" in o) {
		data.altText =
			o.altText === null || o.altText === undefined ? null : String(o.altText);
	}
	if (typeof o.mediaType === "string") {
		data.mediaType = o.mediaType.slice(0, 64);
	}
	if (typeof o.sortOrder === "number" && Number.isFinite(o.sortOrder)) {
		data.sortOrder = o.sortOrder;
	}

	if (Object.keys(data).length === 0) {
		return new NextResponse("No fields to update", { status: 400 });
	}

	const row = await sqlClient.productImages.update({
		where: { id },
		data,
	});

	logger.info("Product image updated", {
		metadata: { imageId: id, productId: params.productId },
		tags: ["api"],
	});

	transformPrismaDataForJson(row);
	return NextResponse.json(row);
}

/** JSON body `{ id: string }` — deletes DB row and S3 object when configured. */
export async function DELETE(
	req: Request,
	props: { params: Promise<{ storeId: string; productId: string }> },
) {
	const params = await props.params;
	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof NextResponse) {
		return access;
	}

	if (!params.productId) {
		return new NextResponse("product id is required", { status: 400 });
	}

	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return new NextResponse("Invalid JSON", { status: 400 });
	}

	const id =
		body &&
		typeof body === "object" &&
		"id" in body &&
		typeof (body as { id: unknown }).id === "string"
			? (body as { id: string }).id
			: null;

	if (!id) {
		return new NextResponse("id is required", { status: 400 });
	}

	const existing = await findOwnedImage(params.storeId, params.productId, id);
	if (!existing) {
		return new NextResponse("Image not found", { status: 404 });
	}

	await tryDeleteS3Object(existing.imgPublicId);

	const obj = await sqlClient.productImages.delete({
		where: { id },
	});

	logger.info("Product image deleted", {
		metadata: { imageId: id, productId: params.productId },
		tags: ["api"],
	});

	transformPrismaDataForJson(obj);
	return NextResponse.json(obj);
}
