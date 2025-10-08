// /api/sysAdmin/emailQueue

import { NextResponse } from "next/server";
import { CheckAdminApiAccess } from "../api_helper";
import { sqlClient } from "@/lib/prismadb";

// get all email queue
export async function GET(_request: Request) {
	//check admin access
	await CheckAdminApiAccess();

	const mailQueue = await sqlClient.emailQueue.findMany({
		orderBy: {
			createdOn: "desc",
		},
		take: 100,
	});

	return NextResponse.json(mailQueue);
}
