"use client";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { useTimer } from "react-timer-hook";
import { useTranslation } from "@/app/i18n/client";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";
import type { Rsvp, StoreOrder } from "@/types";
import { navigateAfterCheckout } from "@/utils/checkout-post-payment-navigate";
import {
	type SerializedRsvpForStorage,
	transformReservationForStorage,
} from "@/lib/reservation/utils";
import { Loader } from "./loader";

type paymentProps = {
	order?: StoreOrder;
	orderId?: string;
	returnUrl?: string;
	rsvp?: Rsvp | null;
	postPaymentSignInToken?: string;
};

// show order success prompt and then redirect the customer to view order page (購物明細)
// or to custom returnUrl if provided
export const SuccessAndRedirect: React.FC<paymentProps> = ({
	order,
	orderId,
	returnUrl,
	rsvp,
	postPaymentSignInToken,
}) => {
	// Fixed once per mount so session/auth re-renders do not reset react-timer-hook.
	const REDIRECT_DELAY_SECONDS = 3;
	const expiryTimestamp = useMemo(
		() => new Date(Date.now() + REDIRECT_DELAY_SECONDS * 1000),
		[],
	);

	// Use order.id if order is provided, otherwise fall back to orderId
	const finalOrderId = order?.id || orderId;

	if (!finalOrderId) {
		return <div>No order ID provided</div>;
	}

	return (
		<MyTimer
			expiryTimestamp={expiryTimestamp}
			order={order}
			orderId={finalOrderId}
			returnUrl={returnUrl}
			rsvp={rsvp}
			postPaymentSignInToken={postPaymentSignInToken}
		/>
	);
};

function MyTimer({
	expiryTimestamp,
	order,
	orderId,
	returnUrl,
	rsvp,
	postPaymentSignInToken,
}: {
	expiryTimestamp: Date;
	order?: StoreOrder;
	orderId: string;
	returnUrl?: string;
	rsvp?: Rsvp | null;
	postPaymentSignInToken?: string;
}) {
	const router = useRouter();
	const didNavigateRef = useRef(false);
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
		if (!needsSignIn || !order?.id || !returnUrl || !postPaymentSignInToken)
			return;
		const signInUrl = `/api/rsvp-post-payment-signin?token=${encodeURIComponent(postPaymentSignInToken)}&returnUrl=${encodeURIComponent(returnUrl)}`;
		window.location.href = signInUrl;
	}, [needsSignIn, order?.id, returnUrl, postPaymentSignInToken]);

	// Update localStorage for anonymous users when RSVP is paid
	useEffect(() => {
		if (rsvp && order?.storeId && typeof window !== "undefined") {
			try {
				const storageKey = `rsvp-${order.storeId}`;
				const storedData = localStorage.getItem(storageKey);
				const existingReservations: SerializedRsvpForStorage[] = storedData
					? JSON.parse(storedData)
					: [];

				const reservationForStorage = transformReservationForStorage(rsvp);

				// Find and update the reservation in localStorage, or add it if it doesn't exist
				const existingIndex = existingReservations.findIndex(
					(r) => r.id === rsvp.id,
				);

				let updatedReservations: SerializedRsvpForStorage[];
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
				if (process.env.NODE_ENV !== "production") {
					console.warn("Failed to update localStorage for RSVP", {
						rsvpId: rsvp.id,
						storeId: order.storeId,
						error: error instanceof Error ? error.message : String(error),
					});
				}
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
			// Skip auto-redirect when showing OTP sign-in prompt
			if (needsSignIn) return;
			if (didNavigateRef.current) return;
			didNavigateRef.current = true;
			navigateAfterCheckout(router, {
				orderId,
				order,
				returnUrl,
			});
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
