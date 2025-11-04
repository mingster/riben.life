import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

export async function DELETE(
	req: Request,
	props: {
		params: Promise<{ storeId: string; productId: string; imageId: string }>;
	},
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		if (!params.productId) {
			return new NextResponse("product id is required", { status: 400 });
		}
		if (!params.imageId) {
			return new NextResponse("image id is required", { status: 400 });
		}

		logger.info("Operation log", {
			tags: ["api"],
		});

		const body = await req.json();
		const { publicId } = body;

		const obj = await sqlClient.productImages.delete({
			where: {
				imgPublicId: publicId,
				//id: params.imageId,
			},
		});

		return NextResponse.json(obj);
	} catch (error) {
		logger.info("product image delete", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse("Internal error", { status: 500 });
	}
}
