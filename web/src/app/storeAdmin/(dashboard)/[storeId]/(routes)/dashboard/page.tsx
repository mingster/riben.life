import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Loader } from "@/components/loader";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { Role } from "@prisma/client";
import { Suspense } from "react";
import { ChartBarInteractive } from "./components/chart-bar-interactive";
import { RsvpStats } from "../components/rsvp-stats";

type Params = Promise<{ storeId: string }>;

export default async function Page(props: { params: Params }) {
	// check user session
	const session = await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	});

	let canAccess = false;
	// if user is admin or affiliate, they can access the page
	if (
		session &&
		(session.user.role === Role.admin ||
			session.user.role === Role.storeAdmin ||
			session.user.role === Role.owner ||
			session.user.role === Role.staff)
	) {
		canAccess = true;
	}

	if (!canAccess) {
		redirect("/signIn/?callbackUrl=/storeAdmin");
		return <></>;
	}

	const params = await props.params;

	// Fetch store and rsvpSettings for RsvpStats
	const [store, rsvpSettings] = await Promise.all([
		sqlClient.store.findUnique({
			where: { id: params.storeId },
			select: {
				id: true,
				defaultCurrency: true,
				defaultTimezone: true,
			},
		}),
		sqlClient.rsvpSettings.findFirst({
			where: { storeId: params.storeId },
		}),
	]);

	if (!store) {
		redirect("/storeAdmin");
		return <></>;
	}

	transformPrismaDataForJson(rsvpSettings);
	transformPrismaDataForJson(store);

	return (
		<Suspense fallback={<Loader />}>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				{rsvpSettings?.acceptReservation && (
					<RsvpStats
						rsvpSettings={rsvpSettings}
						defaultCurrency={store.defaultCurrency}
						storeTimezone={store.defaultTimezone || "Asia/Taipei"}
					/>
				)}

				<ChartBarInteractive storeId={store.id} />
			</div>
		</Suspense>
	);
}
