import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { auth } from "@/lib/auth";
import type { RsvpStatsPeriod } from "@/lib/rsvp/compute-rsvp-stats";
import { computeRsvpStats } from "@/lib/rsvp/compute-rsvp-stats";
import { transformPrismaDataForJson } from "@/utils/utils";

const PERIODS: RsvpStatsPeriod[] = ["week", "month", "year", "all", "custom"];

function parsePeriod(value: string | null): RsvpStatsPeriod {
	if (value && PERIODS.includes(value as RsvpStatsPeriod)) {
		return value as RsvpStatsPeriod;
	}
	return "month";
}

export async function GET(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof Response) {
		return access;
	}

	const session = await auth.api.getSession({
		headers: await headers(),
	});
	const currentUserId = session?.user?.id;
	const userRole = session?.user?.role;
	const isStaff = userRole === Role.staff;
	const staffFilter =
		isStaff && currentUserId ? { createdBy: currentUserId } : undefined;

	const url = new URL(req.url);
	const period = parsePeriod(url.searchParams.get("period"));

	let startEpoch: bigint | null = null;
	let endEpoch: bigint | null = null;
	const startRaw = url.searchParams.get("startEpoch");
	const endRaw = url.searchParams.get("endEpoch");
	if (startRaw) {
		try {
			startEpoch = BigInt(startRaw);
		} catch {
			return new NextResponse("Invalid startEpoch", { status: 400 });
		}
	}
	if (endRaw) {
		try {
			endEpoch = BigInt(endRaw);
		} catch {
			return new NextResponse("Invalid endEpoch", { status: 400 });
		}
	}

	try {
		const data = await computeRsvpStats({
			storeId: params.storeId,
			period,
			startEpoch,
			endEpoch,
			staffFilter,
		});
		transformPrismaDataForJson(data);
		return NextResponse.json(data);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		if (message.includes("startEpoch and endEpoch")) {
			return new NextResponse("Invalid startEpoch and endEpoch", {
				status: 400,
			});
		}
		throw err;
	}
}
