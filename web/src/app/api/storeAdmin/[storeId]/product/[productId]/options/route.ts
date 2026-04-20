import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { parseProductOptionSelectionLine } from "@/lib/store-admin/parse-product-option-selection-line";
import { transformPrismaDataForJson } from "@/utils/utils";

///!SECTION list product options (with selections).
export async function GET(
	_req: Request,
	props: { params: Promise<{ storeId: string; productId: string }> },
) {
	const params = await props.params;
	const gate = await CheckStoreAdminApiAccess(params.storeId);
	if (gate instanceof NextResponse) {
		return gate;
	}

	if (!params.productId) {
		return new NextResponse("product id is required", { status: 400 });
	}

	const product = await sqlClient.product.findFirst({
		where: { id: params.productId, storeId: params.storeId },
		select: { id: true },
	});
	if (!product) {
		return new NextResponse("Product not found", { status: 404 });
	}

	const rows = await sqlClient.productOption.findMany({
		where: { productId: params.productId },
		include: { ProductOptionSelections: { orderBy: { name: "asc" } } },
		orderBy: { sortOrder: "asc" },
	});

	transformPrismaDataForJson(rows);
	return NextResponse.json(rows);
}

///!SECTION create product option and its selections.
// called by: AddProductOptionDialog.
export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string; productId: string }> },
) {
	const params = await props.params;
	try {
		const gate = await CheckStoreAdminApiAccess(params.storeId);
		if (gate instanceof NextResponse) {
			return gate;
		}

		if (!params.storeId) {
			return new NextResponse("store id is required", { status: 400 });
		}

		if (!params.productId) {
			return new NextResponse("product id is required", { status: 400 });
		}

		const product = await sqlClient.product.findFirst({
			where: { id: params.productId, storeId: params.storeId },
			select: { id: true },
		});
		if (!product) {
			return new NextResponse("Product not found", { status: 404 });
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

		// 1. create product option
		const productOption = await sqlClient.productOption.upsert({
			create: {
				productId: params.productId,
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
				productId_optionName: {
					productId: params.productId,
					optionName: body.optionName,
				},
			},
		});

		await sqlClient.product.update({
			where: { id: params.productId },
			data: { useOption: true },
		});

		const { selections } = body;
		// 2. create product selection
		const selection_lines = selections.split("\n");

		for (let i = 0; i < selection_lines.length; i++) {
			const { name, price, isDefault, imageUrl } =
				parseProductOptionSelectionLine(selection_lines[i]);
			if (!name) continue;

			await sqlClient.productOptionSelections.upsert({
				where: {
					optionId_name: {
						optionId: productOption.id,
						name: name,
					},
				},
				create: {
					optionId: productOption.id,
					name: name,
					price: price,
					isDefault: isDefault,
					imageUrl: imageUrl ?? undefined,
				},
				update: {
					name: name,
					price: price,
					isDefault: isDefault,
					imageUrl: imageUrl ?? null,
				},
			});
		}

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
		for (let i = 0; i < selection_lines.length; i++) {
			const { name, price, isDefault } = parseProductOptionSelectionLine(
				selection_lines[i],
			);
			if (!name) continue;

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
	} catch (error) {
		logger.info("productoption post", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
