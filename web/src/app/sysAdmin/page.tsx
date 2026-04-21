import Link from "next/link";

import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function SysAdminDashboardPage() {
	const [userCount, storeCount, countryCount, currencyCount, localeCount] =
		await Promise.all([
			sqlClient.user.count(),
			sqlClient.store.count({ where: { isDeleted: false } }),
			sqlClient.country.count(),
			sqlClient.currency.count(),
			sqlClient.locale.count(),
		]);

	const needsInstall =
		countryCount === 0 || currencyCount === 0 || localeCount === 0;

	return (
		<Container>
			{needsInstall && (
				<Alert className="mb-6">
					<AlertTitle>Reference data missing</AlertTitle>
					<AlertDescription>
						Run{" "}
						<code className="rounded bg-muted px-1">
							bun run install:platform
						</code>{" "}
						or open the{" "}
						<Link href="/install" className="underline">
							install page
						</Link>
						.
					</AlertDescription>
				</Alert>
			)}

			<section className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
				<div className="rounded-lg border p-4">
					<p className="text-muted-foreground text-sm">Users</p>
					<p className="text-3xl font-bold tabular-nums">{userCount}</p>
				</div>
				<div className="rounded-lg border p-4">
					<p className="text-muted-foreground text-sm">Stores</p>
					<p className="text-3xl font-bold tabular-nums">{storeCount}</p>
				</div>
				<div className="rounded-lg border p-4">
					<p className="text-muted-foreground text-sm">Countries</p>
					<p className="text-3xl font-bold tabular-nums">{countryCount}</p>
				</div>
				<div className="rounded-lg border p-4">
					<p className="text-muted-foreground text-sm">Locales</p>
					<p className="text-3xl font-bold tabular-nums">{localeCount}</p>
				</div>
			</section>
		</Container>
	);
}
