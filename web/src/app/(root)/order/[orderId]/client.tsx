"use client";

import { useMemo } from "react";
import { useTranslation } from "@/app/i18n/client";
import ClientSignIn from "@/components/auth/client-signin";
import { DisplayOrder } from "@/components/display-order";
import { GlobalNavbar } from "@/components/global-navbar";
import StoreRequirePrepaidPrompt from "@/components/store-require-prepaid-prompt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import Container from "@/components/ui/container";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";
import type { Store, StoreOrder, Rsvp } from "@/types";
import Link from "next/link";

export interface props {
	store: Store;
	order: StoreOrder;
	rsvp?: Rsvp | null;
}

// display the given order in whole page if user is signed in.
// If no login session, show the order on the left, and ask user to sign in panel on the right.
// view order page (購物明細)
export const DisplayClient: React.FC<props> = ({ store, order, rsvp }) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const { data: session } = authClient.useSession();
	// Check if user is signed in (not anonymous)
	// Anonymous users created via Better Auth anonymous plugin have emails like guest-{id}@riben.life
	const isSignedIn = useMemo(() => {
		if (!session?.user) return false;
		// Check if user is anonymous (guest user)
		const userEmail = session.user.email;
		const isAnonymousUser =
			userEmail &&
			userEmail.startsWith("guest-") &&
			userEmail.endsWith("@riben.life");
		// Only consider it "signed in" if user exists and is not anonymous
		return !isAnonymousUser;
	}, [session?.user]);

	// Determine the "Keep Shopping" link destination
	// For RSVP orders that are paid, redirect to reservation history
	const keepShoppingHref =
		rsvp && order.isPaid
			? `/s/${store.id}/reservation/history`
			: `/s/${store.id}`;

	//console.log("order", JSON.stringify(order));

	return (
		<div className="bg-no-repeat bg-[url('/img/beams/hero@75.jpg')] dark:bg-[url('/img/beams/hero-dark@90.jpg')]">
			<GlobalNavbar title="" />
			<Container>
				{store.requirePrepaid && order.isPaid === false && (
					<StoreRequirePrepaidPrompt />
				)}

				{isSignedIn ? (
					// Signed in: show order in full width
					<>
						<h1 className="text-4xl sm:text-xl pb-2">
							{t("order_view_title")}
						</h1>

						<DisplayOrder
							order={order}
							showOrderNotes={true}
							showPickupCode={false}
							hidePaymentMethod={true}
							hideOrderStatus={false}
							hideContactSeller={false}
						/>

						<Link href={keepShoppingHref} className="">
							<Button className="w-full">
								{t("cart_summary_keep_shopping")}
							</Button>
						</Link>
					</>
				) : (
					// Not signed in: two-column layout (order on left, sign-in on right)
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch w-full">
						<div className="flex h-full">
							<Card className="w-full h-full flex flex-col">
								<CardHeader>
									<CardTitle className="text-lg pt-2 md:text-2xl font-light leading-relaxed text-foreground/80">
										{t("order_view_title")}
									</CardTitle>
								</CardHeader>
								<CardContent className="flex-1 flex flex-col">
									<div className="flex-1">
										<DisplayOrder
											order={order}
											showOrderNotes={true}
											showPickupCode={false}
											hidePaymentMethod={true}
											hideOrderStatus={false}
											hideContactSeller={false}
										/>
									</div>

									{order.isPaid === true ? (
										<Link href={keepShoppingHref} className="mt-4">
											<Button className="w-full">
												{t("cart_summary_keep_shopping")}
											</Button>
										</Link>
									) : (
										//display link to checkout if order is not paid
										<Link href={`/checkout/${order.id}`} className="mt-4">
											<Button className="w-full bg-amber-600 hover:bg-amber-700">
												{t("cart_summary_checkout")}
											</Button>
										</Link>
									)}
								</CardContent>
							</Card>
						</div>

						<div className="flex h-full">
							<ClientSignIn
								title={t("order_sign_in_benefits")}
								className="w-full h-full"
								callbackUrl={`/s/${store.id}`}
							/>
						</div>
					</div>
				)}
			</Container>
		</div>
	);
};
