import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";

type RouteProps = { params: Promise<{ storeId: string; productId: string }> };

export async function POST(req: Request, props: RouteProps) {
	const params = await props.params;
	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof NextResponse) return access;

	const product = await sqlClient.product.findFirst({
		where: { id: params.productId, storeId: params.storeId },
		select: { id: true },
	});
	if (!product) return new NextResponse("Product not found", { status: 404 });

	const body = (await req.json()) as {
		targetProductId?: string;
		sortOrder?: number;
	};

	if (typeof body.targetProductId !== "string" || !body.targetProductId) {
		return new NextResponse("targetProductId is required", { status: 400 });
	}
	if (body.targetProductId === params.productId) {
		return new NextResponse("Cannot relate a product to itself", {
			status: 400,
		});
	}

	const target = await sqlClient.product.findFirst({
		where: { id: body.targetProductId, storeId: params.storeId },
		select: { id: true },
	});
	if (!target)
		return new NextResponse("Target product not found", { status: 404 });

	const sortOrder =
		typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
			? Math.trunc(body.sortOrder)
			: 0;

	await sqlClient.productRelatedProduct.upsert({
		where: {
			sourceProductId_targetProductId: {
				sourceProductId: params.productId,
				targetProductId: body.targetProductId,
			},
		},
		update: { sortOrder },
		create: {
			sourceProductId: params.productId,
			targetProductId: body.targetProductId,
			sortOrder,
		},
	});

	return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(_req: Request, props: RouteProps) {
	const params = await props.params;
	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof NextResponse) return access;

	const product = await sqlClient.product.findFirst({
		where: { id: params.productId, storeId: params.storeId },
		select: { id: true },
	});
	if (!product) return new NextResponse("Product not found", { status: 404 });

	await sqlClient.productRelatedProduct.deleteMany({
		where: { sourceProductId: params.productId },
	});

	return NextResponse.json({ ok: true }, { status: 200 });
}
