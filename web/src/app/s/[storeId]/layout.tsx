import { CartProvider } from "@/hooks/use-cart";
import { sqlClient } from "@/lib/prismadb";
import { isReservedRoute } from "@/lib/reserved-routes";
import type { Store } from "@/types";
import { StoreFooter } from "./components/store-footer";
import { StoreNavbar } from "./components/store-navbar";

import BusinessHours from "@/lib/businessHours";
import { transformPrismaDataForJson } from "@/utils/utils";
import { isValidGuid } from "@/utils/guid-utils";
import type { StoreSettings } from "@prisma/client";
import type { Metadata, ResolvingMetadata } from "next";
import { redirect } from "next/navigation";
type Props = {
	params: Promise<{ storeId: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
	props: Props,
	//parent: ResolvingMetadata,
): Promise<Metadata> {
	const params = await props.params;

	// Prevent admin and reserved routes from being treated as store routes
	if (isReservedRoute(params.storeId)) {
		return {
			title: "riben.life",
		};
	}

	// Find store by ID (UUID) or name
	// Try ID first if it looks like a UUID, otherwise try name
	const isUuid = isValidGuid(params.storeId);
	const store = (await sqlClient.store.findFirst({
		where: isUuid
			? { id: params.storeId }
			: { name: { equals: params.storeId, mode: "insensitive" } },
		include: {
			Categories: {
				where: { isFeatured: true },
				orderBy: { sortOrder: "asc" },
			},
			StoreAnnouncement: true,
		},
	})) as Store;

	if (!store) return { title: "riben.life" };

	return {
		title: store.name,
		//keywords: searchParams.keywords,
	};
}

export default async function StoreHomeLayout(props: {
	params: Promise<{
		storeId: string;
	}>;
	children: React.ReactNode;
}) {
	const params = await props.params;

	const {
		// will be a page or nested layout
		children,
	} = props;

	// Prevent admin and reserved routes from being treated as customer store pages
	// Pass through children without store layout for reserved routes
	if (isReservedRoute(params.storeId)) {
		// Reserved routes - pass through children without store layout
		return <>{children}</>;
	}

	// Find store by ID (UUID) or name
	// Try ID first if it looks like a UUID, otherwise try name
	const isUuid = isValidGuid(params.storeId);
	const store = (await sqlClient.store.findFirst({
		where: isUuid
			? { id: params.storeId }
			: { name: { equals: params.storeId, mode: "insensitive" } },
		include: {
			Categories: {
				where: { isFeatured: true },
				orderBy: { sortOrder: "asc" },
			},
			StoreAnnouncement: true,
			rsvpSettings: true,
		},
	})) as Store;

	if (store === null) {
		redirect("/storeAdmin");
		//return <Loader/>;
		//throw new Error("store not found");
	}

	transformPrismaDataForJson(store);

	// Use the actual store ID for subsequent queries (in case we found by name)
	const actualStoreId = store.id;
	const storeSettings = (await sqlClient.storeSettings.findFirst({
		where: {
			storeId: actualStoreId,
		},
	})) as StoreSettings;

	let isStoreOpen = store.isOpen;
	if (storeSettings != null) {
		const bizHour = storeSettings.businessHours;
		if (store.useBusinessHours && bizHour !== null) {
			const businessHours = new BusinessHours(bizHour);
			isStoreOpen = businessHours.isOpenNow();
		}
	}

	return (
		<CartProvider>
			<div className="bg-repeat bg-[url('/img/beams/hero@75.jpg')] dark:bg-[url('/img/beams/hero-dark@90.jpg')]">
				<StoreNavbar visible={true} store={store} />
				<main>
					<span className="hash-span" id="top" />
					{children}
				</main>
				<StoreFooter visible={isStoreOpen} store={store} />
			</div>
		</CartProvider>
	);
}
