"use client";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { useRouter } from "next/navigation";
import { useTimer } from "react-timer-hook";
import { useEffect } from "react";
import logger from "@/lib/logger";
import { StoreOrder, Rsvp } from "@/types";
import { Suspense } from "react";
import { Loader } from "./loader";
import { authClient } from "@/lib/auth-client";

type paymentProps = {
	order?: StoreOrder;
	orderId?: string;
	returnUrl?: string;
	rsvp?: Rsvp | null;
};

// show order success prompt and then redirect the customer to view order page (購物明細)
// or to custom returnUrl if provided
export const SuccessAndRedirect: React.FC<paymentProps> = ({
	order,
	orderId,
	returnUrl,
	rsvp,
}) => {
	const seconds = 3;
	const timeStamp = new Date(Date.now() + seconds * 1000);

	// Use order.id if order is provided, otherwise fall back to orderId
	const finalOrderId = order?.id || orderId;

	if (!finalOrderId) {
		return <div>No order ID provided</div>;
	}

	return (
		<MyTimer
			expiryTimestamp={timeStamp}
			order={order}
			orderId={finalOrderId}
			returnUrl={returnUrl}
			rsvp={rsvp}
		/>
	);
};

function MyTimer({
	expiryTimestamp,
	order,
	orderId,
	returnUrl,
	rsvp,
}: {
	expiryTimestamp: Date;
	order?: StoreOrder;
	orderId: string;
	returnUrl?: string;
	rsvp?: Rsvp | null;
}) {
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// Anonymous user with phone-matched existing account: sign in after paid (no OTP)
	const customerId = rsvp?.customerId ?? null;
	const needsSignIn =
		customerId &&
		returnUrl?.includes("reservation/history") &&
		(!session?.user || session.user.id !== customerId);

	// Redirect to sign-in API when anonymous user needs to sign in (phone matched existing user)
	useEffect(() => {
		if (!needsSignIn || !order?.id || !returnUrl) return;
		const signInUrl = `/api/rsvp-post-payment-signin?orderId=${encodeURIComponent(order.id)}&returnUrl=${encodeURIComponent(returnUrl)}`;
		window.location.href = signInUrl;
	}, [needsSignIn, order?.id, returnUrl]);

	// Update localStorage for anonymous users when RSVP is paid
	useEffect(() => {
		if (rsvp && order?.storeId && typeof window !== "undefined") {
			try {
				const storageKey = `rsvp-${order.storeId}`;
				const storedData = localStorage.getItem(storageKey);
				const existingReservations: Rsvp[] = storedData
					? JSON.parse(storedData)
					: [];

				// Transform RSVP data for localStorage (convert BigInt/Date to number)
				const reservationForStorage = {
					...rsvp,
					rsvpTime:
						typeof rsvp.rsvpTime === "number"
							? rsvp.rsvpTime
							: rsvp.rsvpTime instanceof Date
								? rsvp.rsvpTime.getTime()
								: typeof rsvp.rsvpTime === "bigint"
									? Number(rsvp.rsvpTime)
									: null,
					createdAt:
						typeof rsvp.createdAt === "number"
							? rsvp.createdAt
							: rsvp.createdAt instanceof Date
								? rsvp.createdAt.getTime()
								: typeof rsvp.createdAt === "bigint"
									? Number(rsvp.createdAt)
									: null,
					updatedAt:
						typeof rsvp.updatedAt === "number"
							? rsvp.updatedAt
							: rsvp.updatedAt instanceof Date
								? rsvp.updatedAt.getTime()
								: typeof rsvp.updatedAt === "bigint"
									? Number(rsvp.updatedAt)
									: null,
				};

				// Find and update the reservation in localStorage, or add it if it doesn't exist
				const existingIndex = existingReservations.findIndex(
					(r) => r.id === rsvp.id,
				);

				let updatedReservations: Rsvp[];
				if (existingIndex >= 0) {
					// Update existing reservation
					updatedReservations = [...existingReservations];
					updatedReservations[existingIndex] = reservationForStorage;
				} else {
					// Add new reservation if it doesn't exist
					updatedReservations = [
						...existingReservations,
						reservationForStorage,
					];
				}

				// Save updated reservations back to localStorage
				localStorage.setItem(storageKey, JSON.stringify(updatedReservations));
			} catch (error) {
				// Silently handle errors updating localStorage
				logger.warn("Failed to update localStorage for RSVP", {
					metadata: {
						rsvpId: rsvp.id,
						storeId: order.storeId,
						error: error instanceof Error ? error.message : String(error),
					},
					tags: ["rsvp", "localStorage", "checkout"],
				});
			}
		}
	}, [rsvp, order?.storeId]);

	const {
		seconds,
		minutes,
		hours,
		days,
		isRunning,
		start,
		pause,
		resume,
		restart,
	} = useTimer({
		expiryTimestamp,
		onExpire: () => {
			logger.warn("onExpire called");
			// Skip auto-redirect when showing OTP sign-in prompt
			if (needsSignIn) return;
			if (returnUrl) {
				router.push(returnUrl);
			} else {
				router.push(`/order/${orderId}`);
			}
		},
	});

	// Pause timer when redirecting to sign-in (anonymous user with matched phone)
	useEffect(() => {
		if (needsSignIn) {
			pause();
		}
	}, [needsSignIn, pause]);

	if (!orderId) {
		return "no order";
	}

	return (
		<Suspense fallback={<Loader />}>
			<div className="container relative flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-3 pb-10 sm:px-4 lg:px-6">
				<section className="mx-auto flex max-w-[980px] flex-col items-center gap-2 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-6">
					<h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
						{t("success_title")}
					</h2>
					<p className="text-center text-lg text-muted-foreground">
						{t("order_success_descr")}
					</p>
				</section>
				{/* Anonymous user with phone-matched account: redirecting to sign in */}
				{needsSignIn && (
					<p className="text-center text-sm text-muted-foreground">
						{t("signing_in") || "Signing you in..."}
					</p>
				)}
				<div className="relative flex w-full justify-center"> </div>
			</div>
		</Suspense>
	);
}
