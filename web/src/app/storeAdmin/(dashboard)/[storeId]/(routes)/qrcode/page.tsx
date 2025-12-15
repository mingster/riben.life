import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import type { StoreFacility } from "@prisma/client";
import { QrCodeClient } from "./client";
import { getStoreWithRelations } from "@/lib/store-access";
import { redirect } from "next/navigation";
import { transformPrismaDataForJson } from "@/utils/utils";
import { Heading } from "@/components/heading";

import { getT } from "@/app/i18n";
import { Suspense } from "react";
import { Loader } from "@/components/loader";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function QrCodePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Note: checkStoreStaffAccess already called in layout (cached)
	// Parallel queries for optimal performance
	const [store, facilities] = await Promise.all([
		getStoreWithRelations(params.storeId),
		sqlClient.storeFacility.findMany({
			where: { storeId: params.storeId },
			orderBy: { facilityName: "asc" },
		}),
	]);

	transformPrismaDataForJson(store);
	transformPrismaDataForJson(facilities);

	if (!store) {
		redirect("/storeAdmin");
	}

	const { t } = await getT();

	return (
		<Suspense fallback={<Loader />}>
			<Heading
				title={t("qr_code_page_title")}
				description={t("qr_code_page_description")}
			/>
			<QrCodeClient store={store} facilities={facilities as StoreFacility[]} />
		</Suspense>
	);
}
