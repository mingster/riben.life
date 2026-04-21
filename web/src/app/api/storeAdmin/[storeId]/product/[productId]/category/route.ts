import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";

export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string; productId: string }> },
) {
	const params = await props.params;
	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof NextResponse) {
		return access;
	}

	const product = await sqlClient.product.findFirst({
		where: { id: params.productId, storeId: params.storeId },
		select: { id: true },
	});
	if (!product) {
		return new NextResponse("Product not found", { status: 404 });
	}

	const body = (await req.json()) as {
		productId?: string;
		categoryId?: string;
		sortOrder?: number;
	};

	if (body.productId !== params.productId) {
		return new NextResponse("productId mismatch", { status: 400 });
	}
	if (typeof body.categoryId !== "string" || !body.categoryId) {
		return new NextResponse("categoryId is required", { status: 400 });
	}

	const category = await sqlClient.category.findFirst({
		where: { id: body.categoryId, storeId: params.storeId },
		select: { id: true },
	});
	if (!category) {
		return new NextResponse("Category not found", { status: 404 });
	}

	const sortOrder =
		typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
			? Math.trunc(body.sortOrder)
			: 0;

	await sqlClient.productCategories.create({
		data: {
			productId: params.productId,
			categoryId: body.categoryId,
			sortOrder,
		},
	});

	return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(
	_req: Request,
	props: { params: Promise<{ storeId: string; productId: string }> },
) {
	const params = await props.params;
	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof NextResponse) {
		return access;
	}

	const product = await sqlClient.product.findFirst({
		where: { id: params.productId, storeId: params.storeId },
		select: { id: true },
	});
	if (!product) {
		return new NextResponse("Product not found", { status: 404 });
	}

	await sqlClient.productCategories.deleteMany({
		where: { productId: params.productId },
	});

	return NextResponse.json({ ok: true }, { status: 200 });
}
