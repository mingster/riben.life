import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { NextResponse } from "next/server";

// Called by StoreSwitcher to obtain user's store(s)
//
export async function GET(
	_req: Request,
	props: { params: Promise<{ ownerId: string }> },
) {
	const params = await props.params;
	if (!params.ownerId) {
		return new NextResponse("User is required", { status: 401 });
	}
	//const body = await req.json();

	//const { ownerId } = body;

	if (!params.ownerId) {
		return new NextResponse("Unauthenticated", { status: 403 });
	}

	const stores = await sqlClient.store.findMany({
		where: {
			ownerId: params.ownerId,
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
			ownerId: true,
			organizationId: true,
			defaultLocale: true,
			defaultCountry: true,
			defaultCurrency: true,
			level: true,
			isDeleted: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	transformPrismaDataForJson(stores);

	//console.log('stores: ' + JSON.stringify(stores));

	return NextResponse.json(stores);
}
