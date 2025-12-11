import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { getUtcNow } from "@/utils/datetime-utils";
import { transformPrismaDataForJson } from "@/utils/utils";
import { epochToDate } from "@/utils/datetime-utils";
import { format } from "date-fns";

// Helper function to escape CSV fields
// Always wrap fields in double quotes and escape any existing quotes
function escapeCsvField(field: string | null | undefined): string {
	if (field === null || field === undefined) {
		return '""';
	}
	const str = String(field);
	// Escape any existing double quotes by doubling them, then wrap in quotes
	return `"${str.replace(/"/g, '""')}"`;
}

// Define CSV columns (shared across the function)
const CSV_COLUMNS = [
	"id",
	"name",
	"email",
	"phone",
	"memberRole",
	"createdAt",
	"banned",
	"creditPoints",
];

// Convert array of objects to CSV string
function arrayToCsv(data: Array<Record<string, unknown>>): string {
	// Always create header row, even for empty data
	const header = CSV_COLUMNS.map(escapeCsvField).join(",");

	if (data.length === 0) {
		return header;
	}

	// Create data rows
	const rows = data.map((row) => {
		return CSV_COLUMNS.map((col) => {
			let value = row[col];
			// Format createdAt as ISO string if it's a BigInt
			if (col === "createdAt" && value) {
				const date = epochToDate(value as bigint);
				value = date ? format(date, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'") : "";
			}
			// Convert boolean to string
			if (typeof value === "boolean") {
				value = value ? "true" : "false";
			}
			// Convert number to string
			if (typeof value === "number") {
				value = String(value);
			}
			return escapeCsvField(value as string);
		}).join(",");
	});

	return [header, ...rows].join("\n");
}

export async function POST(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;

	try {
		CheckStoreAdminApiAccess(params.storeId);

		// Get store to find organization
		const store = await sqlClient.store.findUnique({
			where: {
				id: params.storeId,
			},
			select: {
				organizationId: true,
			},
		});

		if (!store || !store.organizationId) {
			return NextResponse.json(
				{
					success: false,
					error: "Store not found or has no organization",
				},
				{ status: 404 },
			);
		}

		// Get all member users in the organization
		const members = await sqlClient.member.findMany({
			where: {
				organizationId: store.organizationId,
			},
		});

		if (members.length === 0) {
			// Return empty CSV with headers
			const emptyCsv = arrayToCsv([]);
			const now = getUtcNow();
			const pad = (n: number) => n.toString().padStart(2, "0");
			const fileName = `customers-export-${params.storeId}-${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}.csv`;

			return new NextResponse(emptyCsv, {
				status: 200,
				headers: {
					"Content-Type": "text/csv; charset=utf-8",
					"Content-Disposition": `attachment; filename="${fileName}"`,
				},
			});
		}

		// Fetch users
		const users = await sqlClient.user.findMany({
			where: {
				id: {
					in: members.map((member) => member.userId),
				},
			},
			include: {
				sessions: true,
				members: true,
				CustomerCredits: {
					where: {
						storeId: params.storeId,
					},
				},
			},
		});

		// Map users to include the member role for this organization and credit points
		const usersWithRole = users.map((user) => {
			const member = user.members.find(
				(m: { organizationId: string; role: string }) =>
					m.organizationId === store.organizationId,
			);
			// Get CustomerCredit for this store (should be at most one due to unique constraint)
			const customerCredit = user.CustomerCredits[0];
			const creditPoints = customerCredit ? Number(customerCredit.point) : 0;

			return {
				id: user.id,
				name: user.name || "",
				email: user.email || "",
				phone: user.phone || "",
				memberRole: member?.role || "",
				createdAt: user.createdAt,
				banned: user.banned || false,
				creditPoints,
			};
		});

		// Transform BigInt to numbers for serialization (though we'll format dates in CSV)
		transformPrismaDataForJson(usersWithRole);

		// Convert to CSV
		const csvContent = arrayToCsv(usersWithRole);

		// Prepare file name using UTC methods
		const now = getUtcNow();
		const pad = (n: number) => n.toString().padStart(2, "0");
		const fileName = `customers-export-${params.storeId}-${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}.csv`;

		// Return file as download
		return new NextResponse(csvContent, {
			status: 200,
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition": `attachment; filename="${fileName}"`,
			},
		});
	} catch (error: unknown) {
		logger.error("customers export", {
			metadata: {
				storeId: params.storeId,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "error"],
		});
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
