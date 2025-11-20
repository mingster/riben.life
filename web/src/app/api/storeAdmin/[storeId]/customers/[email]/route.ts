import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { authClient } from "@/lib/auth-client";

///!SECTION update user in database.
export async function DELETE(
	req: Request,
	props: { params: Promise<{ storeId: string; email: string }> },
) {
	const params = await props.params;
	CheckStoreAdminApiAccess(params.storeId);

	logger.info(`params: ${params.email}`);

	if (!params.email) {
		return new NextResponse("user email is required", { status: 400 });
	}

	//try {
	//get user by email

	// delete all data related to the user
	const user = await sqlClient.user.findUnique({
		where: {
			email: params.email,
		},
	});

	if (user) {
		// delete all api keys
		await sqlClient.apikey.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// delete all passkeys
		await sqlClient.passkey.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// delete all sessions

		await sqlClient.session.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// delete all accounts

		await sqlClient.account.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// delete all twofactors

		await sqlClient.twoFactor.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// delete all subscriptions of the user

		await sqlClient.subscription.deleteMany({
			where: {
				referenceId: user.id,
			},
		});

		// delete all invitation of the user

		await sqlClient.invitation.deleteMany({
			where: {
				email: user.email as string,
			},
		});

		// delete all members of the user

		await sqlClient.member.deleteMany({
			where: {
				userId: user.id,
			},
		});

		await authClient.admin.removeUser({
			userId: user.id,
		});
	}

	return NextResponse.json(
		{
			success: true,
			message: "user deleted",
		},
		{ status: 200 },
	);
	/*} catch (error) {
		logger.error(`[USER_DELETE] ${error}`);
		return new NextResponse(`Internal error: ${error}`, { status: 500 });
	}*/
}
