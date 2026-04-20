import { getT } from "@/app/i18n";
import { sqlClient } from "@/lib/prismadb";
import { parseStorefrontPickupLocationsJson } from "@/lib/shop/storefront-fulfillment";

type Params = Promise<{ storeId: string }>;

export const revalidate = 300;

export default async function ShopLocationsPage(props: { params: Params }) {
	const { t } = await getT(undefined, "shop");
	const { storeId } = await props.params;

	const [settings, store] = await Promise.all([
		sqlClient.storeSettings.findUnique({
			where: { storeId },
			select: {
				storefrontPickupLocationsJson: true,
				firstName: true,
				lastName: true,
				streetLine1: true,
				streetLine2: true,
				city: true,
				province: true,
				postalCode: true,
				country: true,
				phoneNumber: true,
			},
		}),
		sqlClient.store.findFirst({
			where: { id: storeId, isDeleted: false },
			select: { name: true },
		}),
	]);

	const pickup = parseStorefrontPickupLocationsJson(
		settings?.storefrontPickupLocationsJson,
	);

	const hqLines: string[] = [];
	if (settings && store) {
		const nameParts = [settings.firstName, settings.lastName]
			.filter(Boolean)
			.join(" ");
		if (nameParts) {
			hqLines.push(nameParts);
		}
		if (settings.streetLine1) {
			hqLines.push(settings.streetLine1);
		}
		if (settings.streetLine2) {
			hqLines.push(settings.streetLine2);
		}
		const cityLine = [settings.city, settings.province, settings.postalCode]
			.filter(Boolean)
			.join(", ");
		if (cityLine) {
			hqLines.push(cityLine);
		}
		if (settings.country) {
			hqLines.push(settings.country);
		}
	}

	return (
		<div className="space-y-10">
			<div>
				<h1 className="font-serif text-3xl font-light tracking-tight sm:text-4xl">
					{t("shop_locations_title")}
				</h1>
				<p className="mt-2 max-w-xl text-sm text-muted-foreground">
					{t("shop_locations_intro")}
				</p>
			</div>

			{store && hqLines.length > 0 ? (
				<section className="rounded-lg border border-border/80 bg-card/30 p-5 sm:p-6">
					<h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
						{store.name}
					</h2>
					<address className="mt-3 text-sm not-italic leading-relaxed text-foreground">
						{hqLines.map((line) => (
							<span key={line} className="block">
								{line}
							</span>
						))}
						{settings?.phoneNumber ? (
							<span className="mt-2 block text-muted-foreground">
								{settings.phoneNumber}
							</span>
						) : null}
					</address>
				</section>
			) : null}

			<section>
				<h2 className="text-sm font-medium">
					{t("shop_locations_click_collect_heading")}
				</h2>
				{pickup.length === 0 ? (
					<p className="mt-2 text-sm text-muted-foreground">
						{t("shop_locations_pickup_empty")}
					</p>
				) : (
					<ul className="mt-4 grid gap-4 sm:grid-cols-2">
						{pickup.map((loc) => (
							<li
								key={loc.id}
								className="rounded-lg border border-border/80 p-4 sm:p-5"
							>
								<p className="font-medium">{loc.name}</p>
								<p className="mt-2 text-sm text-muted-foreground">
									{loc.line1}
									<br />
									{loc.city}
									{loc.country ? `, ${loc.country}` : ""}
								</p>
								{loc.hours ? (
									<p className="mt-2 text-xs text-muted-foreground">
										{loc.hours}
									</p>
								) : null}
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
