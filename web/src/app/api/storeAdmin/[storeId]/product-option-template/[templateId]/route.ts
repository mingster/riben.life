import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import { NextResponse } from "next/server";

//delete product option template by its id
export async function DELETE(
	req: Request,
	props: {
		params: Promise<{ productId: string; storeId: string; templateId: string }>;
	},
) {
	const params = await props.params;
	//try {
	CheckStoreAdminApiAccess(params.storeId);

	if (!params.templateId) {
		return new NextResponse("template id is required", { status: 400 });
	}

	await sqlClient.storeProductOptionSelectionsTemplate.deleteMany({
		where: {
			optionId: params.templateId,
		},
	});

	const obj = await sqlClient.storeProductOptionTemplate.delete({
		where: {
			id: params.templateId,
		},
	});

	return NextResponse.json(obj);
	/*} catch (error) {
    console.log("[PRODUCT_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }*/
}

///!SECTION update product option template and its selections.
// called by: AddProductOptionTemplateDialog.
export async function PATCH(
	req: Request,
	props: {
		params: Promise<{ storeId: string; productId: string; templateId: string }>;
	},
) {
	const params = await props.params;
	CheckStoreAdminApiAccess(params.storeId);

	if (!params.templateId) {
		return new NextResponse("template id is required", { status: 400 });
	}

	const body = await req.json();

	//console.log(JSON.stringify(body));

	if (!body.optionName) {
		return new NextResponse("Name is required", { status: 400 });
	}

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

	// 1. update product option template
	await sqlClient.storeProductOptionTemplate.update({
		where: {
			id: params.templateId,
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

	// 2. update product selection
	const { selections } = body;

	await sqlClient.storeProductOptionSelectionsTemplate.deleteMany({
		where: {
			optionId: params.templateId,
		},
	});

	const selection_lines = selections.split("\n");
	for (let i = 0; i < selection_lines.length; i++) {
		const tmp = selection_lines[i].trim();
		if (tmp.length === 0) continue;

		const selection = tmp.split(":");
		const name = selection[0];
		const price = Number.parseInt(selection[1]?.trim()) || 0;
		const isDefault = selection[2]?.trim() === "1";

		await sqlClient.storeProductOptionSelectionsTemplate.create({
			data: {
				name,
				price,
				isDefault,
				optionId: params.templateId,
			},
		});
	}

	const result = await sqlClient.storeProductOptionTemplate.findUnique({
		where: {
			id: params.templateId,
		},
		include: {
			StoreProductOptionSelectionsTemplate: true,
		},
	});

	transformDecimalsToNumbers(result);

	return NextResponse.json(result);
}
