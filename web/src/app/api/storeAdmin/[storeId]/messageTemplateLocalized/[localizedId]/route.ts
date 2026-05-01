import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";

///!SECTION store-level message template management is disabled.
export async function DELETE(
	_req: Request,
	props: {
		params: Promise<{ storeId: string; localizedId: string }>;
	},
) {
	const params = await props.params;
	await CheckStoreAdminApiAccess(params.storeId);
	return new NextResponse(
		"Store-level message template management is disabled",
		{ status: 403 },
	);
}
