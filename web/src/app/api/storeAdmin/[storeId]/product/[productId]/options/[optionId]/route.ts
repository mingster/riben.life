import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

//delete product option by its id
export async function DELETE(
	_req: Request,
	props: {
		params: Promise<{ productId: string; storeId: string; optionId: string }>;
	},
) {
	const params = await props.params;
	//try {
	CheckStoreAdminApiAccess(params.storeId);

	if (!params.productId) {
		return new NextResponse("product id is required", { status: 400 });
	}

	if (!params.optionId) {
		return new NextResponse("option id is required", { status: 400 });
	}

	const obj = await sqlClient.productOptionSelections.deleteMany({
		where: {
			optionId: params.optionId,
		},
	});

	await sqlClient.productOption.delete({
		where: {
			id: params.optionId,
		},
	});

	// if no more product option, update product'useOption to false
	const count = await sqlClient.productOption.count({
		where: {
			productId: params.productId,
		},
	});

	if (count === 0) {
		await sqlClient.product.update({
			where: {
				id: params.productId,
			},
			data: {
				useOption: false,
			},
		});
	}

	transformPrismaDataForJson(obj);
	return NextResponse.json(obj);
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

///!SECTION update product option and its selections.
// called by: AddProductOptionDialog.
export async function PATCH(
	req: Request,
	props: {
		params: Promise<{ storeId: string; productId: string; optionId: string }>;
	},
) {
	const params = await props.params;
	CheckStoreAdminApiAccess(params.storeId);

	if (!params.productId) {
		return new NextResponse("product id is required", { status: 400 });
	}

	if (!params.optionId) {
		return new NextResponse("option id is required", { status: 400 });
	}

	const body = await req.json();

	if (!body.optionName) {
		return new NextResponse("Name is required", { status: 400 });
	}

	//console.log(JSON.stringify(body));

	const {
		optionName,
		isRequired,
		isMultiple,
		minSelection,
		maxSelection,
		allowQuantity,
		minQuantity,
		maxQuantity,
		sortOrder,
	} = body;

	// 1. create product option
	const productOption = await sqlClient.productOption.update({
		where: {
			id: params.optionId,
		},
		data: {
			optionName,
			isRequired,
			isMultiple,
			minSelection,
			maxSelection,
			allowQuantity,
			minQuantity,
			maxQuantity,
			sortOrder,
		},
	});

	// 2. create product selection
	const { selections } = body;

	await sqlClient.productOptionSelections.deleteMany({
		where: {
			optionId: params.optionId,
		},
	});

	const selection_lines = selections.split("\n");
	//console.log("selection_lines", selection_lines);

	for (let i = 0; i < selection_lines.length; i++) {
		const tmp = selection_lines[i].trim();
		if (tmp.length === 0) continue;

		const selection = tmp.split(":");
		const name = selection[0]?.trim();
		const price = Number.parseInt(selection[1]?.trim()) || 0;
		const isDefault = selection[2]?.trim() === "1";

		//console.log("create selection", name, price, isDefault);

		await sqlClient.productOptionSelections.create({
			data: {
				name: name,
				price: price,
				isDefault: isDefault,
				optionId: params.optionId,
			},
		});
	}

	const result = await sqlClient.productOption.findUnique({
		where: {
			id: productOption.id,
		},
		include: {
			ProductOptionSelections: true,
		},
	});

	transformPrismaDataForJson(result);

	return NextResponse.json(result);
}
