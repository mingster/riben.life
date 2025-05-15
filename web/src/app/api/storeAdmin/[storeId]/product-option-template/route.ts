import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { NextResponse } from "next/server";

///!SECTION create product option template and its selections.
// called by: AddProductOptionTemplateDialog.
export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string; productId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		if (!params.storeId) {
			return new NextResponse("store id is required", { status: 400 });
		}
		const body = await req.json();

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

		// 3. create store option template if doesn't exist
		const storeproductOption =
			await sqlClient.storeProductOptionTemplate.upsert({
				create: {
					storeId: params.storeId,
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
				update: {
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
				where: {
					storeId_optionName: {
						storeId: params.storeId,
						optionName: body.optionName,
					},
				},
			});

		// 4. create store option selection template if doesn't exist
		const { selections } = body;
		const selection_lines = selections.split("\n");
		for (let i = 0; i < selection_lines.length; i++) {
			const tmp = selection_lines[i];
			const selection = tmp.split(":");
			const name = selection[0];
			const price = Number.parseInt(selection[1]?.trim()) || 0;
			const isDefault = selection[2]?.trim() === "1";
			await sqlClient.storeProductOptionSelectionsTemplate.upsert({
				where: {
					optionId_name: {
						optionId: storeproductOption.id,
						name: name,
					},
				},
				create: {
					optionId: storeproductOption.id,
					name: name,
					price: price,
					isDefault: isDefault,
				},
				update: {
					name: name,
					price: price,
					isDefault: isDefault,
				},
			});
		}

		const result = await sqlClient.storeProductOptionTemplate.findUnique({
			where: {
				id: storeproductOption.id,
			},
			include: {
				StoreProductOptionSelectionsTemplate: true,
			},
		});

		transformDecimalsToNumbers(result);

		return NextResponse.json(result);
	} catch (error) {
		console.log("[PRODUCTOPTION_POST]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
