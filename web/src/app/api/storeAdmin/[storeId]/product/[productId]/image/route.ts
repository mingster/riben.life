import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

///!SECTION create product image in database.
export async function PATCH(
	req: Request,
	props: { params: Promise<{ storeId: string; productId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		if (!params.productId) {
			return new NextResponse("product id is required", { status: 400 });
		}

		const body = await req.json();
		const obj = await sqlClient.productImages.create({
			data: { ...body },
		});

		logger.info("Operation log", {
			tags: ["api"],
		});

		return NextResponse.json(obj);
	} catch (error) {
		logger.info("product image patch", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}

export async function DELETE(
	req: Request,
	props: { params: Promise<{ storeId: string; productId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		if (!params.productId) {
			return new NextResponse("product id is required", { status: 400 });
		}

		const body = await req.json();
		const { id, publicId } = body;
		logger.info("Operation log", {
			tags: ["api"],
		});
		logger.info("Operation log", {
			tags: ["api"],
		});

		const obj = await sqlClient.productImages.delete({
			where: {
				//imgPublicId: publicId,
				id: id,
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
