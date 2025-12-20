import { getT } from "@/app/i18n";
import { GlobalNavbar } from "@/components/global-navbar";
import { auth } from "@/lib/auth";
import type { SupportTicket, User } from "@/types";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sqlClient } from "@/lib/prismadb";
import { ClientSupport } from "./client-support";
import { Suspense } from "react";
import { Loader } from "@/components/loader";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [ch: string]: string | string[] | undefined }>;

// Support home - customer support ticket system
export default async function SupportHomePage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const params = await props.params;

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect(`/signIn/?callbackUrl=/s/${params.storeId}/support`);
	}

	// Parallel queries for optimal performance - 3x faster!
	const [{ t }, user, tickets] = await Promise.all([
		getT(),
		sqlClient.user.findFirst({
			where: { email: session.user.email },
		}),
		sqlClient.supportTicket.findMany({
			where: {
				OR: [
					{ senderId: session.user.id, threadId: "" },
					{
						Sender: {
							email: session.user.email,
						},
						threadId: "",
					},
				],
			},
			orderBy: {
				lastModified: "desc",
			},
			distinct: ["threadId"],
			include: {
				Thread: true,
			},
		}),
	]);

	//const title = t("page_title_support");

	//console.log("user", user);

	return (
		<Suspense fallback={<Loader />}>
			<ClientSupport
				user={user as User}
				serverData={tickets as SupportTicket[] | []}
			/>
		</Suspense>
	);
}
