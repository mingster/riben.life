import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";

// import { getUtcNowEpoch } from "@/utils/datetime-utils"; // User model still uses DateTime with defaults
import { CheckAdminApiAccess } from "../../api_helper";
import logger from "@/lib/logger";
import { authClient } from "@/lib/auth-client";

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
		CheckAdminApiAccess();

		if (!params.userId) {
			return new NextResponse("user email is required", { status: 400 });
		}

		// userId parameter is actually the user's email
		const userEmail = params.userId;

		logger.info("Deleting user", {
			metadata: { userEmail },
			tags: ["api", "sysAdmin", "user-delete"],
		});

		// Find user by email
		const user = await sqlClient.user.findUnique({
			where: {
				email: userEmail,
			},
		});

		if (!user) {
			return new NextResponse("User not found", { status: 404 });
		}

		// Delete all data related to the user
		// Delete all api keys
		await sqlClient.apikey.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// Delete all passkeys
		await sqlClient.passkey.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// Delete all sessions
		await sqlClient.session.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// Delete all accounts
		await sqlClient.account.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// Delete all twofactors
		await sqlClient.twoFactor.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// Delete all subscriptions of the user
		await sqlClient.subscription.deleteMany({
			where: {
				referenceId: user.id,
			},
		});

		// Delete all invitations of the user
		await sqlClient.invitation.deleteMany({
			where: {
				email: user.email as string,
			},
		});

		// Delete all members of the user
		await sqlClient.member.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// Remove user from Better Auth
		await authClient.admin.removeUser({
			userId: user.id,
		});

		logger.info("User deleted successfully", {
			metadata: { userId: user.id, userEmail },
			tags: ["api", "sysAdmin", "user-delete"],
		});

		return NextResponse.json(
			{
				success: true,
				message: "user deleted",
			},
			{ status: 200 },
		);
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
