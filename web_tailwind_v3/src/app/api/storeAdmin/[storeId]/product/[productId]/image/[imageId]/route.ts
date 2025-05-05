import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";

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

		console.log(`delete product image: ${params.imageId}`);

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
		console.log("[PRODUCT_IMAGE_DELETE]", error);

		return new NextResponse("Internal error", { status: 500 });
	}
}
