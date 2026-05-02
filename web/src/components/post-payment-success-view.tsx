"use client";

import { Suspense } from "react";
import { Loader } from "@/components/loader";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import type { Rsvp, StoreOrder } from "@/types";

export interface PostPaymentSuccessViewProps {
	order: StoreOrder;
	returnUrl?: string;
	rsvp?: Rsvp | null;
	postPaymentSignInToken?: string;
}

/**
 * Standard UI for post-checkout success: suspense, container, 3s countdown, then redirect.
 * All `/(root)/checkout/[orderId]/*` paid/success paths should use this instead of inlining
 * `SuccessAndRedirect` so layout and props stay consistent.
 */
export function PostPaymentSuccessView({
	order,
	returnUrl,
	rsvp,
	postPaymentSignInToken,
}: PostPaymentSuccessViewProps) {
	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<SuccessAndRedirect
					order={order}
					returnUrl={returnUrl}
					rsvp={rsvp}
					postPaymentSignInToken={postPaymentSignInToken}
				/>
			</Container>
		</Suspense>
	);
}
