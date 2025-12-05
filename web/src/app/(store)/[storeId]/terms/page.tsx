import Container from "@/components/ui/container";
import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import { isValidGuid } from "@/utils/guid-utils";
import type { StoreSettings } from "@prisma/client";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ReactMarkdown from "react-markdown";

import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

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
			<Container>
				<section className="mx-auto flex flex-col items-center gap-2 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-6">
					<div className="max-w-[750px]">
						<ReactMarkdown remarkPlugins={[remarkGfm, remarkHtml]}>
							{storeSettings.tos}
						</ReactMarkdown>
					</div>
				</section>
			</Container>
		</Suspense>
	);
}
