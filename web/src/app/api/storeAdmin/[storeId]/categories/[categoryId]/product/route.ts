import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";

export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string; categoryId: string }> },
) {
	const params = await props.params;
	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof NextResponse) {
		return access;
	}

	const category = await sqlClient.category.findFirst({
		where: { id: params.categoryId, storeId: params.storeId },
		select: { id: true },
	});
	if (!category) {
		return new NextResponse("Category not found", { status: 404 });
	}

	const body = (await req.json()) as {
		productId?: string;
		categoryId?: string;
		sortOrder?: number;
	};

	if (body.categoryId !== params.categoryId) {
		return new NextResponse("categoryId mismatch", { status: 400 });
	}
	if (typeof body.productId !== "string" || !body.productId) {
		return new NextResponse("productId is required", { status: 400 });
	}

	const product = await sqlClient.product.findFirst({
		where: { id: body.productId, storeId: params.storeId },
		select: { id: true },
	});
	if (!product) {
		return new NextResponse("Product not found", { status: 404 });
	}

	const sortOrder =
		typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
			? Math.trunc(body.sortOrder)
			: 0;

	await sqlClient.productCategories.create({
		data: {
			productId: body.productId,
			categoryId: params.categoryId,
			sortOrder,
		},
	});

	return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(
	_req: Request,
	props: { params: Promise<{ storeId: string; categoryId: string }> },
) {
	const params = await props.params;
	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof NextResponse) {
		return access;
	}

	const category = await sqlClient.category.findFirst({
		where: { id: params.categoryId, storeId: params.storeId },
		select: { id: true },
	});
	if (!category) {
		return new NextResponse("Category not found", { status: 404 });
	}

	await sqlClient.productCategories.deleteMany({
		where: { categoryId: params.categoryId },
	});

	return NextResponse.json({ ok: true }, { status: 200 });
}
