import Link from "next/link";
import { redirect } from "next/navigation";
import Container from "@/components/ui/container";
import { AdminDashboardContent } from "./components/admin-dashboard-content";
import { sqlClient } from "@/lib/prismadb";

// System Admin Dashboard - displays platform-wide statistics
export default async function AdminPage() {
	// Parallel queries for optimal performance - 4x faster!
	const [customerCount, countryCount, currencyCount, localeCount] =
		await Promise.all([
			sqlClient.user.count(),
			sqlClient.country.count(),
			sqlClient.currency.count(),
			sqlClient.locale.count(),
		]);

	// Redirect to install page if platform data not initialized
	if (countryCount === 0 || currencyCount === 0 || localeCount === 0) {
		redirect("/install");
	}

	return (
		<>
			<AdminDashboardContent />
			<Container>
				{(countryCount === 0 || currencyCount === 0) && (
					<Link href="/install">You need to install default data.</Link>
				)}

				<section className="mx-auto flex max-w-[980px] flex-col items-center gap-1 py-1 md:py-2 md:pb-8 lg:py-1 lg:pb-1">
					<div className="grid grid-cols-3 gap-4 py-4 md:gap-6 md:py-6">
						<div>
							# of customers:
							<span className="text-2xl font-extrabold">{customerCount}</span>
						</div>
						<div>
							# of countries:
							<span className="text-2xl font-extrabold">{countryCount}</span>
						</div>
						<div>
							# of currencies:
							<span className="text-2xl font-extrabold">{currencyCount}</span>
						</div>
						<div>
							# of locales:
							<span className="text-2xl font-extrabold">{localeCount}</span>
						</div>
					</div>
				</section>
			</Container>
		</>
	);
}
