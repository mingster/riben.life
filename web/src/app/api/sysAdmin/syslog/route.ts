// /api/sysAdmin/emailQueue

import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckAdminApiAccess } from "../api_helper";

// get all email queue
export async function GET(_request: Request) {
	//check admin access
	await CheckAdminApiAccess();

	const systemLogs = await sqlClient.system_logs.findMany({
		orderBy: {
			timestamp: "desc",
		},
	});

	return NextResponse.json(systemLogs);
}

// delete all system logs
export async function DELETE(request: Request) {
	//check admin access
	await CheckAdminApiAccess();

	await sqlClient.system_logs.deleteMany();

	return NextResponse.json(
		{ message: "All system logs deleted" },
		{ status: 200 },
	);
}
