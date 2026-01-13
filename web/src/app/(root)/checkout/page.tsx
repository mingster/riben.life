import { redirect } from "next/navigation";
import { sqlClient } from "@/lib/prismadb";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import logger from "@/lib/logger";
import { SafeError } from "@/utils/error";
import { createRsvpStoreOrder } from "@/actions/store/reservation/create-rsvp-store-order";
import { getT } from "@/app/i18n";
import { transformPrismaDataForJson } from "@/utils/utils";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * Checkout page that handles rsvpId query parameter.
 * Creates an order for the reservation if it doesn't exist, then redirects to /checkout/{orderId}
 */
export default async function CheckoutPage(props: {
	searchParams: SearchParams;
}) {
	const searchParams = await props.searchParams;
	const rsvpId =
		typeof searchParams.rsvpId === "string" ? searchParams.rsvpId : undefined;

	if (!rsvpId) {
		throw new SafeError("RSVP ID is required");
	}

	// Get session to check if user is logged in
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	const sessionUserId = session?.user?.id;

	// Fetch RSVP with all necessary relations
	const rsvp = await sqlClient.rsvp.findUnique({
		where: { id: rsvpId },
		include: {
			Store: {
				select: {
					id: true,
					defaultCurrency: true,
					defaultTimezone: true,
				},
			},
			Facility: {
				select: {
					id: true,
					facilityName: true,
				},
			},
			ServiceStaff: {
				include: {
					User: {
						select: {
							name: true,
							email: true,
						},
					},
				},
			},
			Order: {
				select: {
					id: true,
					isPaid: true,
				},
			},
		},
	});

	if (!rsvp) {
		logger.error("RSVP not found for checkout", {
			metadata: { rsvpId },
			tags: ["checkout", "rsvp", "error"],
		});
		throw new SafeError("Reservation not found");
	}

	// If order already exists, redirect to it
	if (rsvp.orderId && rsvp.Order) {
		// If order is already paid, redirect to success page
		if (rsvp.Order.isPaid) {
			redirect(`/checkout/${rsvp.orderId}/success`);
		}
		// Otherwise, redirect to checkout page
		redirect(`/checkout/${rsvp.orderId}`);
	}

	// Calculate costs
	const facilityCost = rsvp.facilityCost ? Number(rsvp.facilityCost) : 0;
	const serviceStaffCost = rsvp.serviceStaffCost
		? Number(rsvp.serviceStaffCost)
		: 0;
	const totalCost = facilityCost + serviceStaffCost;

	// If no cost, no need to create order
	if (totalCost <= 0) {
		logger.warn("RSVP has no cost, redirecting to reservation page", {
			metadata: { rsvpId, storeId: rsvp.storeId },
			tags: ["checkout", "rsvp"],
		});
		redirect(`/s/${rsvp.storeId}/reservation`);
	}

	// Determine customer ID (use session user if logged in, otherwise use RSVP's customerId)
	const customerId = sessionUserId || rsvp.customerId;

	if (!customerId) {
		// For anonymous users, redirect to sign-in with callback to checkout
		// After sign-in, they'll be redirected back here to create the order
		const callbackUrl = `/checkout?rsvpId=${rsvpId}`;
		redirect(`/signIn?callbackUrl=${encodeURIComponent(callbackUrl)}`);
	}

	// Get service staff name
	const serviceStaffName =
		rsvp.ServiceStaff?.User?.name ||
		rsvp.ServiceStaff?.User?.email ||
		rsvp.serviceStaffId ||
		null;

	// Create order for the reservation
	try {
		const { t } = await getT();
		const orderNote = `${t("rsvp_reservation_payment_note") || "RSVP reservation payment"} (RSVP ID: ${rsvp.id})`;

		const orderId = await sqlClient.$transaction(async (tx) => {
			// Create order
			const createdOrderId = await createRsvpStoreOrder({
				tx,
				storeId: rsvp.storeId,
				customerId, // Use session user or RSVP's customerId
				facilityCost: facilityCost > 0 ? facilityCost : null,
				serviceStaffCost: serviceStaffCost > 0 ? serviceStaffCost : null,
				currency: rsvp.Store.defaultCurrency || "twd",
				paymentMethodPayUrl: "TBD", // Will be selected at checkout
				rsvpId: rsvp.id,
				facilityId: rsvp.facilityId,
				productName: rsvp.Facility?.facilityName || "Reservation",
				serviceStaffId: rsvp.serviceStaffId,
				serviceStaffName,
				rsvpTime: rsvp.rsvpTime,
				note: orderNote,
				displayToCustomer: false,
				isPaid: false, // Customer will pay at checkout
			});

			// Update RSVP with orderId and customerId (if available from session)
			// This links the reservation to the user's account after checkout
			await tx.rsvp.update({
				where: { id: rsvp.id },
				data: {
					orderId: createdOrderId,
					// Update customerId if we have a session user and RSVP doesn't have one
					// This ensures anonymous reservations are linked to the user after checkout
					...(customerId && !rsvp.customerId && { customerId }),
				},
			});

			return createdOrderId;
		});

		logger.info("Created order for RSVP checkout", {
			metadata: { rsvpId, orderId, storeId: rsvp.storeId },
			tags: ["checkout", "rsvp", "order"],
		});

		// Redirect to checkout page with orderId
		redirect(`/checkout/${orderId}`);
	} catch (error) {
		// Next.js redirect() throws a special error that should not be logged
		if (error instanceof Error && error.message === "NEXT_REDIRECT") {
			// Expected control flow from redirect(); do not log as an error
			throw error;
		}
		logger.error("Failed to create order for RSVP checkout", {
			metadata: {
				rsvpId,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["checkout", "rsvp", "error"],
		});
		throw error;
	}
}
