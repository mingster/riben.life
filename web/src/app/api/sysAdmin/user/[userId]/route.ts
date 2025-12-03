import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";

// import { getUtcNowEpoch } from "@/utils/datetime-utils"; // User model still uses DateTime with defaults
import { CheckAdminApiAccess } from "../../api_helper";
import logger from "@/lib/logger";

///!SECTION update user in database.
export async function PATCH(
	req: Request,
	props: { params: Promise<{ userId: string }> },
) {
	return new NextResponse("deprecated", { status: 500 });

	/*
	const params = await props.params;
	try {
		CheckAdminApiAccess();

		if (!params.userId) {
			return new NextResponse("user id is required", { status: 400 });
		}

		const body = await req.json();
		const obj = await sqlClient.user.update({
			where: {
				id: params.userId,
			},
			data: { ...body }, // User model has @updatedAt directive
		});

		logger.info("Operation log", {
			tags: ["api"],
		});

		return NextResponse.json(obj);
	} catch (error) {
		logger.info("user patch", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api"],
		});

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
		*/
}
