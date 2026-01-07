import DisplayMarkDown from "@/components/display-mark-down";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { isValidGuid } from "@/utils/guid-utils";
import type { StoreSettings } from "@prisma/client";
import { redirect } from "next/navigation";
import { Suspense } from "react";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreTermsPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	// Find store by ID (UUID) or name
	// Try ID first if it looks like a UUID, otherwise try name
	const isUuid = isValidGuid(params.storeId);
	const store = await sqlClient.store.findFirst({
		where: isUuid
			? { id: params.storeId }
			: { name: { equals: params.storeId, mode: "insensitive" } },
	});

	if (!store) {
		redirect("/unv");
	}

	// Use the actual store ID for subsequent queries (in case we found by name)
	const actualStoreId = store.id;
	const storeSettings = (await sqlClient.storeSettings.findFirst({
		where: {
			storeId: actualStoreId,
		},
	})) as StoreSettings;

	if (storeSettings === null) return;
	if (storeSettings.tos === null) return;

	return (
		<Suspense fallback={<Loader />}>
			<div className="min-h-screen">
				<Container className="font-minimal pt-0 bg-[url('/img/noise.147fc0e.gif')] bg-repeat dark:bg-none">
					<div className="min-h-screen flex flex-col font-minimal">
						{/* Main Content */}
						<main className="flex-1 flex flex-col justify-center items-center px-4 py-16 md:py-24 font-minimal">
							<div className="w-full max-w-4xl">
								{/*display markdown content */}
								<DisplayMarkDown content={storeSettings.tos} />
							</div>
						</main>
					</div>
				</Container>
			</div>
		</Suspense>

	);
}
