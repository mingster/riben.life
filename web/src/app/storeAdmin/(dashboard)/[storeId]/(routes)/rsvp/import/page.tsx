import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { ClientImportRsvp } from "../components/client-import-rsvp";
import { Loader } from "@/components/loader";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function RsvpImportPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Get current user session
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user?.id) {
		throw new Error("Unauthenticated");
	}

	// Get store to get timezone and currency
	const [store, serviceStaff] = await Promise.all([
		sqlClient.store.findUnique({
			where: { id: params.storeId },
			select: {
				defaultTimezone: true,
				defaultCurrency: true,
			},
		}),
		sqlClient.serviceStaff.findFirst({
			where: {
				userId: session.user.id,
				storeId: params.storeId,
				isDeleted: false,
			},
			include: {
				User: {
					select: {
						name: true,
						email: true,
					},
				},
			},
		}),
	]);

	if (!store) {
		throw new Error("Store not found");
	}

	const storeTimezone = store.defaultTimezone || "Asia/Taipei";
	const storeCurrency = store.defaultCurrency || "twd";

	// Service staff info for cost calculation
	const serviceStaffInfo = serviceStaff
		? {
				name:
					serviceStaff.User?.name ||
					serviceStaff.User?.email ||
					"Service Staff",
				defaultCost: serviceStaff.defaultCost
					? Number(serviceStaff.defaultCost)
					: 0,
				defaultDuration: serviceStaff.defaultDuration || 60,
			}
		: null;

	return (
		<Container>
			<Suspense fallback={<Loader />}>
				<div className="space-y-4">
					<ClientImportRsvp
						storeTimezone={storeTimezone}
						storeCurrency={storeCurrency}
						serviceStaffInfo={serviceStaffInfo}
					/>
				</div>
			</Suspense>
		</Container>
	);
}
