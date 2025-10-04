import { sqlClient } from "@/lib/prismadb";
import { getUtcNow } from "@/utils/datetime-utils";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../api_helper";

///!SECTION create new product.
export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		const body = await req.json();
		const {
			name,
			description,
			price,
			currency,
			isFeatured,
			status,
			ProductAttribute,
		} = body;

		if (!name) {
			return new NextResponse("Name is required", { status: 400 });
		}

		const product = await sqlClient.product.create({
			data: {
				storeId: params.storeId,
				name,
				description,
				price,
				currency,
				isFeatured,
				status,
				updatedAt: getUtcNow(),
				ProductAttribute: {
					create: { ...ProductAttribute },
				},
			},
		});

		transformDecimalsToNumbers(product);

		//console.log(`create product: ${JSON.stringify(product)}`);

		return NextResponse.json(product);
	} catch (error) {
		console.log("[PRODUCT_POST]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}

// get products in the store
export async function GET(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		const { searchParams } = new URL(req.url);
		//const categoryId = searchParams.get('categoryId') || undefined;
		const isFeatured = searchParams.get("isFeatured");

		if (!params.storeId) {
			return new NextResponse("Store id is required", { status: 400 });
		}

		const products = await sqlClient.product.findMany({
			where: {
				storeId: params.storeId,
				isFeatured: isFeatured ? true : undefined,
			},
			include: {
				//images: true,
				//category: true,
				//productPrices: true,
				ProductAttribute: true,
				//productSpec: { include: { options: true } },
			},
			orderBy: {
				createdAt: "desc",
			},
		});
		transformDecimalsToNumbers(products);

		return NextResponse.json(products);
	} catch (error) {
		console.log("[PRODUCT_GET]", error);

		return new NextResponse("Internal error", { status: 500 });
	}
}

///!SECTION 批量新增 create multiple product record in database.
export async function PATCH(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		const body = await req.json();
		const { names, status } = body;
		if (!names) {
			return new NextResponse("product data is required", { status: 400 });
		}

		const name_array = names.split("\n");

		// we are expecting name|price|description|category_name per line
		for (let i = 0; i < name_array.length; i++) {
			const obj = name_array[i].split("|");

			const name = obj[0];
			const price = obj[1];
			const description = obj[2];
			const category_name = obj[3];

			//產品選項
			const product_option = obj[4];

			// min. requirement: has name and price
			if (name && !Number.isNaN(price)) {
				const product = await sqlClient.product.create({
					data: {
						storeId: params.storeId,
						name: name,
						price: price,
						description: description,
						status,
					},
				});

				// if product and valid category, add the product/category relationship
				//
				if (product && category_name) {
					const category = await sqlClient.category.findFirst({
						where: { name: category_name },
					});

					if (category) {
						await sqlClient.productCategories.create({
							data: {
								productId: product.id,
								categoryId: category.id,
								sortOrder: 1,
							},
						});
					}
				}

				// if product and valid product option, add the product/option selections.
				//
				if (product && product_option) {
					const option_template =
						await sqlClient.storeProductOptionTemplate.findFirst({
							where: { optionName: product_option },
						});

					const option_template_selection =
						await sqlClient.storeProductOptionSelectionsTemplate.findMany({
							where: { optionId: option_template?.id },
						});

					if (option_template) {
						const new_product_option = await sqlClient.productOption.upsert({
							create: {
								productId: product.id,
								optionName: option_template.optionName,
								isRequired: option_template.isRequired,
								isMultiple: option_template.isMultiple,
								minSelection: option_template.minSelection,
								maxSelection: option_template.maxSelection,
								allowQuantity: option_template.allowQuantity,
								minQuantity: option_template.minQuantity,
								maxQuantity: option_template.maxQuantity,
								sortOrder: option_template.sortOrder,
							},
							update: {
								optionName: option_template.optionName,
								isRequired: option_template.isRequired,
								isMultiple: option_template.isMultiple,
								minSelection: option_template.minSelection,
								maxSelection: option_template.maxSelection,
								allowQuantity: option_template.allowQuantity,
								minQuantity: option_template.minQuantity,
								maxQuantity: option_template.maxQuantity,
								sortOrder: option_template.sortOrder,
							},
							where: {
								productId_optionName: {
									productId: params.storeId,
									optionName: option_template.optionName,
								},
							},
						});

						// copy option_selection into new_product_option
						if (option_template_selection) {
							for (let i = 0; i < option_template_selection.length; i++) {
								const obj = option_template_selection[i];
								await sqlClient.productOptionSelections.create({
									data: {
										optionId: new_product_option.id,
										name: obj.name,
										price: obj.price,
										isDefault: obj.isDefault,
									},
								});
							}
						}
					}
				}
			} else {
				console.log(`invalid product data: ${name_array[i]}`);
			}
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.log("[PRODUCT_PATCH]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
