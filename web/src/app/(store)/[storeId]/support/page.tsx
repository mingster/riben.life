import { getT } from "@/app/i18n";
import { GlobalNavbar } from "@/components/global-navbar";
import { Loader } from "@/components/loader";
import { auth } from "@/lib/auth";
import type { SupportTicket, User } from "@/types";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
//import logger from "@/utils/logger";
import { sqlClient } from "@/lib/prismadb";
import { ClientSupport } from "./client-support";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [ch: string]: string | string[] | undefined }>;

// Support home - implement support system as spec'ed in
// @/doc/AI-Powered-Support-Ticket-System-Requirements.md
//
export default async function SupportHomePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	const session = await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	});

	if (!session) {
		redirect(`/signIn/?callbackUrl=/${params.storeId}/support`);
	}

	//const log = logger.child({ module: "SupportHomePage" });

	const { t } = await getT();
	const title = t("page_title_support");

	//get current user
	const user = (await sqlClient.user.findFirst({
		where: {
			email: session.user.email,
		},
	})) as User;

	// get all top level tickets for the customer
	// top level ticket = main ticket = threadId is null
	const tickets = (await sqlClient.supportTicket.findMany({
		where: {
			senderId: user.id,
			threadId: "",
		},
		orderBy: {
			lastModified: "desc",
		},
		distinct: ["threadId"],
		include: {
			Thread: true,
		},
	})) as SupportTicket[];

	return (
		<Suspense fallback={<Loader />}>
			<GlobalNavbar title={title} />
			<ClientSupport user={user} serverData={tickets} />
		</Suspense>
	);
}
