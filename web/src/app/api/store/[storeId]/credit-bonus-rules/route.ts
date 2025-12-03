import { sqlClient } from "@/lib/prismadb";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { transformPrismaDataForJson } from "@/utils/utils";

export async function GET(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const rules = await sqlClient.creditBonusRule.findMany({
		where: {
			storeId: params.storeId,
		},
		orderBy: {
			threshold: "asc",
		},
	});

	transformPrismaDataForJson(rules);
	return NextResponse.json(rules);
}

export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	// Verify ownership
	const store = await sqlClient.store.findFirst({
		where: {
			id: params.storeId,
			ownerId: session.user.id,
		},
	});

	if (!store) {
		return new NextResponse("Unauthorized", { status: 403 });
	}

	const body = await req.json();
	const { threshold, bonus, isActive } = body;

	const rule = await sqlClient.creditBonusRule.create({
		data: {
			storeId: params.storeId,
			threshold: new Prisma.Decimal(threshold),
			bonus: new Prisma.Decimal(bonus),
			isActive: isActive ?? true,
			createdAt: getUtcNowEpoch(),
			updatedAt: getUtcNowEpoch(),
		},
	});

	transformPrismaDataForJson(rule);
	return NextResponse.json(rule);
}

export async function DELETE(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	const { searchParams } = new URL(req.url);
	const ruleId = searchParams.get("id");

	if (!ruleId) {
		return new NextResponse("Rule ID required", { status: 400 });
	}

	// Verify ownership via store
	const count = await sqlClient.store.count({
		where: {
			id: params.storeId,
			ownerId: session.user.id,
		},
	});

	if (count === 0) {
		return new NextResponse("Unauthorized", { status: 403 });
	}

	await sqlClient.creditBonusRule.delete({
		where: {
			id: ruleId,
			storeId: params.storeId, // Ensure it belongs to this store
		},
	});

	return new NextResponse(null, { status: 204 });
}
