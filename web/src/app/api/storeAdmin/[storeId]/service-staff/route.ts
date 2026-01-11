import logger from "@/lib/logger";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../api_helper";
import { getServiceStaffAction } from "@/actions/storeAdmin/serviceStaff/get-service-staff";
import {
	mapServiceStaffToColumn,
	type ServiceStaffColumn,
} from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column";

export async function GET(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		// Use server action which handles access control via storeActionClient
		const result = await getServiceStaffAction(params.storeId, {});

		if (result?.serverError) {
			return NextResponse.json({ error: result.serverError }, { status: 403 });
		}

		const serviceStaff = result?.data?.serviceStaff ?? [];

		// Map service staff to column format, ensuring Decimal objects are converted to numbers
		const formattedData: ServiceStaffColumn[] = serviceStaff.map(
			mapServiceStaffToColumn,
		);

		return NextResponse.json(formattedData);
	} catch (error) {
		logger.error("get service staff", {
			metadata: {
				storeId: params.storeId,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "error"],
		});

		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
