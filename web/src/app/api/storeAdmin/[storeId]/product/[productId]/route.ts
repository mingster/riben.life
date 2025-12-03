import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { getUtcNow } from "@/utils/datetime-utils";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import logger from "@/lib/logger";

//delete product by its id
export async function DELETE(
	_req: Request,
	props: { params: Promise<{ productId: string; storeId: string }> },
) {
	const params = await props.params;
	//try {
	CheckStoreAdminApiAccess(params.storeId);

	if (!params.productId) {
		return new NextResponse("product id is required", { status: 400 });
	}

	// TO-DO: only archive the product if there's order already placed.

	const product = await sqlClient.product.delete({
		where: {
			id: params.productId,
		},
	});

	await sqlClient.productAttribute.deleteMany({
		where: {
			productId: params.productId,
		},
	});
	await sqlClient.productCategories.deleteMany({
		where: {
			productId: params.productId,
		},
	});

	transformPrismaDataForJson(product);

	logger.info("product deleted", {
		tags: ["api"],
	});

	return NextResponse.json(product);
	/*} catch (error) {
    logger.info("product delete", {
    	metadata: {
    		error: error instanceof Error ? error.message : String(error),
    	},
    	tags: ["api"],
    });
    return new NextResponse("Internal error", { status: 500 });
  }*/
}

///!SECTION update product in database.
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
		const {
			name,
			/*,
      description,
      price,
      currency,
      isFeatured,
      useOption,
      status,
      ProductAttribute,*/
		} = body;

		if (!name) {
			return new NextResponse("Name is required", { status: 400 });
		}

		const product = await sqlClient.product.update({
			where: {
				id: params.productId,
			},
			data: {
				...body,
				updatedAt: getUtcNowEpoch(),
				/*
        ProductAttribute: {
          update: { ...ProductAttribute },
        },*/
			},
		});

		transformPrismaDataForJson(product);

		//console.log(`updated product: ${JSON.stringify(product)}`);

		return NextResponse.json(product);
	} catch (error) {
		logger.info("product patch", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
