import { getT } from "@/app/i18n";
import { Loader } from "@/components/loader";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import type { SupportTicket, User } from "@/types";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ClientSupport } from "./components/client-support";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [ch: string]: string | string[] | undefined }>;

// Support admin - implement support system as spec'ed in
// @/doc/AI-Powered-Support-Ticket-System-Requirements.md
//
export default async function SupportAdminPage(props: {
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

	const { t } = await getT();
	const title = t("page_title_support");

	//get the nop customer
	const user = (await sqlClient.user.findFirst({
		where: {
			email: session.user.email,
		},
	})) as User;

	// get all top level, open tickets for entire system
	// top level ticket = main ticket = threadId is null
	const tickets = (await sqlClient.supportTicket.findMany({
		where: {
			/*
			status: {
				not: TicketStatus.Closed, // get all except closed
			},*/
			//customer_id: nopCustomer.CustomerID,
			threadId: "",
		},
		orderBy: {
			lastModified: "desc",
		},
		//distinct: ["threadId"],
		include: {
			Thread: true,
		},
	})) as SupportTicket[];

	//transformDecimalsToNumbers(tickets);

	return (
		<Suspense fallback={<Loader />}>
			<ClientSupport user={user} serverData={tickets} />
		</Suspense>
	);
}
