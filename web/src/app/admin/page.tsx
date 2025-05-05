import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { SubscriptionStatus } from "@/types/enum";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { checkAdminAccess } from "./admin-utils";
import { AdminMockupContent } from "./components/admin-mockup-content";

//
//
export default async function AdminPage() {
	const isAdmin = await checkAdminAccess();
	if (!isAdmin) redirect("/error/?code=500&message=Unauthorized");

	const storeCount = await sqlClient.store.count();
	const customerCount = await sqlClient.user.count();
	const orderCount = await sqlClient.storeOrder.count();
	const productCount = await sqlClient.product.count();

	const subscriptionCount = await sqlClient.subscription.count({
		where: {
			status: Number(SubscriptionStatus.Active),
		},
	});

	const countryCount = await sqlClient.country.count();
	const currencyCount = await sqlClient.currency.count();
	const localeCount = await sqlClient.locale.count();
	const paymentMethodsCount = await sqlClient.paymentMethod.count();
	const shippingMethodsCount = await sqlClient.shippingMethod.count();

	return (
		<Suspense fallback={<Loader />}>
			<AdminMockupContent />

			<div className="container relative pb-10">
				<section className="mx-auto font-mono flex max-w-[980px] flex-col gap-2 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-6">
					{countryCount === 0 ||
						(currencyCount === 0 && (
							<Link href="/install">You need to install default data.</Link>
						))}

					<div className="grid grid-cols-3 gap-4">
						<div>
							# of store:
							<span className="text-2xl font-extrabold">{storeCount}</span>
						</div>
						<div>
							# of subscription:
							<span className="text-2xl font-extrabold">
								{subscriptionCount}
							</span>
						</div>
						<div>
							# of customer:
							<span className="text-2xl font-extrabold">{customerCount}</span>
						</div>
						<div>
							# of order:
							<span className="text-2xl font-extrabold">{orderCount}</span>
						</div>
						<div>
							# of product:
							<span className="text-2xl font-extrabold">{productCount}</span>
						</div>

						<div>
							# of country data:
							<span className="text-2xl font-extrabold">{countryCount}</span>
						</div>
						<div>
							# of currency data:
							<span className="text-2xl font-extrabold">{currencyCount}</span>
						</div>
						<div>
							# of locale data:
							<span className="text-2xl font-extrabold">{localeCount}</span>
						</div>
						<div>
							# of payment method data:
							<span className="text-2xl font-extrabold">
								{paymentMethodsCount}
							</span>
						</div>
						<div>
							# of ship method data:
							<span className="text-2xl font-extrabold">
								{shippingMethodsCount}
							</span>
						</div>
					</div>
				</section>
			</div>
		</Suspense>
	);
}
