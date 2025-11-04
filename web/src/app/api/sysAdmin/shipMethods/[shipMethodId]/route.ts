import { sqlClient } from "@/lib/prismadb";
import { getUtcNow } from "@/utils/datetime-utils";
import { NextResponse } from "next/server";
import { CheckAdminApiAccess } from "../../api_helper";
import logger from "@/lib/logger";

export async function PATCH(
	req: Request,
	props: { params: Promise<{ shipMethodId: string }> },
) {
	const params = await props.params;
	try {
		CheckAdminApiAccess();

		const body = await req.json();

		const obj = await sqlClient.shippingMethod.update({
			where: {
				id: params.shipMethodId,
			},
			data: {
				...body,
				updatedAt: getUtcNow(),
			},
		});

		return NextResponse.json(obj);
	} catch (error) {
		logger.info("patch", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}
