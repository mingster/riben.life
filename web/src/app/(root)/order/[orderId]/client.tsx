"use client";

import { useTranslation } from "@/app/i18n/client";
import ClientSignIn from "@/components/auth/client-signin";
import { DisplayOrder } from "@/components/display-order";
import { GlobalNavbar } from "@/components/global-navbar";
import StoreRequirePrepaidPrompt from "@/components/store-require-prepaid-prompt";
import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";
import type { Store, StoreOrder } from "@/types";
import Link from "next/link";

export interface props {
	store: Store;
	order: StoreOrder;
}

// display the given order in whole page if user is signed in.
// If no login session, show the order on the left, and ask user to sign in panel on the right.
// view order page (購物明細)
export const DisplayClient: React.FC<props> = ({ store, order }) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const { data: session } = authClient.useSession();
	const isSignedIn = Boolean(session?.user);

	//console.log("order", JSON.stringify(order));

	return (
		<div className="bg-no-repeat bg-[url('/img/beams/hero@75.jpg')] dark:bg-[url('/img/beams/hero-dark@90.jpg')]">
			<GlobalNavbar title="" />
			<Container>
				<h1 className="text-4xl sm:text-xl pb-2">{t("order_view_title")}</h1>

				{store.requirePrepaid && order.isPaid === false && (
					<StoreRequirePrepaidPrompt />
				)}

				{isSignedIn ? (
					// Signed in: show order in full width
					<>
						<DisplayOrder
							order={order}
							showOrderNotes={true}
							showPickupCode={false}
							hidePaymentMethod={true}
							hideOrderStatus={false}
							hideContactSeller={false}
						/>

						<Link href={`/s/${store.id}`} className="">
							<Button className="w-full">
								{t("cart_summary_keepShopping")}
							</Button>
						</Link>
					</>
				) : (
					// Not signed in: two-column layout (order on left, sign-in on right)
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<div className="space-y-4">
							<DisplayOrder
								order={order}
								showOrderNotes={true}
								showPickupCode={false}
								hidePaymentMethod={true}
								hideOrderStatus={false}
								hideContactSeller={false}
							/>

							<Link href={`/s/${store.id}`} className="">
								<Button className="w-full">
									{t("cart_summary_keepShopping")}
								</Button>
							</Link>
						</div>

						<div className="space-y-4">
							<ClientSignIn />
						</div>
					</div>
				)}
			</Container>
		</div>
	);
};
