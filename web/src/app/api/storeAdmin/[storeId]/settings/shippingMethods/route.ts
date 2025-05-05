import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";

// manage store's shipping methods
export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	CheckStoreAdminApiAccess(params.storeId);

	const body = await req.json();

	await sqlClient.storeShipMethodMapping.create({
		data: { ...body },
	});

	return NextResponse.json("success", { status: 200 });
}

export async function DELETE(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	CheckStoreAdminApiAccess(params.storeId);

	await sqlClient.storeShipMethodMapping.deleteMany({});

	return NextResponse.json("success", { status: 200 });
}
