import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import {
	deleteProductImageFromS3,
	isProductImagesS3Configured,
} from "@/lib/product-images/s3-storage";
import { transformPrismaDataForJson } from "@/utils/utils";

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

/** `imageId` is the `ProductImages.id` (UUID). */
export async function DELETE(
	_req: Request,
	props: {
		params: Promise<{ storeId: string; productId: string; imageId: string }>;
	},
) {
	const params = await props.params;
	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof NextResponse) {
		return access;
	}

	if (!params.productId) {
		return new NextResponse("product id is required", { status: 400 });
	}
	if (!params.imageId) {
		return new NextResponse("image id is required", { status: 400 });
	}

	const existing = await sqlClient.productImages.findFirst({
		where: {
			id: params.imageId,
			productId: params.productId,
			Product: { storeId: params.storeId },
		},
	});

	if (!existing) {
		return new NextResponse("Image not found", { status: 404 });
	}

	await tryDeleteS3Object(existing.imgPublicId);

	const obj = await sqlClient.productImages.delete({
		where: { id: params.imageId },
	});

	logger.info("Product image deleted", {
		metadata: {
			imageId: params.imageId,
			productId: params.productId,
		},
		tags: ["api"],
	});

	transformPrismaDataForJson(obj);
	return NextResponse.json(obj);
}
