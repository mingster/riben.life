import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { AdminDashboardContent } from "./components/admin-dashboard-content";
import { sqlClient } from "@/lib/prismadb";

// DashboardPage is home of the selected store. It displays store operating stat such as
//total revenue, sales count, products, etc..
export default async function AdminPage() {
	/*
	const isAdmin = (await checkAdminAccess()) as boolean;
	if (!isAdmin) {
		redirect("/signIn/?callbackUrl=/trial");
		return <></>;
	}
	*/

	const customerCount = await sqlClient.user.count();
	const countryCount = await sqlClient.country.count();
	const currencyCount = await sqlClient.currency.count();
	const localeCount = await sqlClient.locale.count();

	// if those counts = 0, redirect to install page
	if (countryCount === 0 || currencyCount === 0 || localeCount === 0) {
		redirect("/install");
	}

	/*
	const peers = await getOnlinePeers();
	//logger.info(`peers: ${JSON.stringify(peers)}`);
	*/

	return (
		<Suspense fallback={<Loader />}>
			<AdminDashboardContent />
			<Container>
				{countryCount === 0 ||
					(currencyCount === 0 && (
						<Link href="/install">You need to install default data.</Link>
					))}

				<section className="mx-auto flex max-w-[980px] flex-col items-center gap-1 py-1 md:py-2 md:pb-8 lg:py-1 lg:pb-1">
					<div className="grid grid-cols-3 gap-4 py-4 md:gap-6 md:py-6">
						<div>
							# of customer:
							<span className="text-2xl font-extrabold">{customerCount}</span>
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
					</div>
				</section>
			</Container>
		</Suspense>
	);
}
