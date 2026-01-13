import { NextResponse } from "next/server";
import { deleteUserAction } from "@/actions/sysAdmin/user/delete-user";
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

///!SECTION delete user in database.
export async function DELETE(
	_req: Request,
	props: { params: Promise<{ userId: string }> },
) {
	try {
		const params = await props.params;

		if (!params.userId) {
			return new NextResponse("user email is required", { status: 400 });
		}

		// userId parameter is actually the user's email
		const userEmail = params.userId;

		// Call server action (handles authentication via adminActionClient)
		const result = await deleteUserAction({ userEmail });

		if (result?.serverError) {
			logger.error("Failed to delete user", {
				metadata: {
					error: result.serverError,
					userEmail,
				},
				tags: ["api", "sysAdmin", "user-delete", "error"],
			});

			// Map server errors to appropriate HTTP status codes
			if (result.serverError === "User not found") {
				return new NextResponse(result.serverError, { status: 404 });
			}

			return new NextResponse(result.serverError, { status: 500 });
		}

		if (!result?.data) {
			return new NextResponse("Internal error", { status: 500 });
		}

		return NextResponse.json(result.data, { status: 200 });
	} catch (error) {
		logger.error("Failed to delete user", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				userId: (await props.params).userId,
			},
			tags: ["api", "sysAdmin", "user-delete", "error"],
		});

		return new NextResponse(
			`Internal error: ${error instanceof Error ? error.message : String(error)}`,
			{ status: 500 },
		);
	}
}
