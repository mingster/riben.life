import getUser from "@/actions/get-user";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import logger from "@/lib/logger";
import type { User } from "@/types";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountTabs } from "./components/tabs";

export const metadata: Metadata = {
	title: "My Account",
};

export default async function AccountPage() {
	const user = (await getUser()) as User;

	logger.info(user);

	if (!user) {
		redirect(`/signin?callbackUrl=/account`);
	} else {
		//console.log(`user: ${JSON.stringify(u)}`);

		return (
			<Suspense fallback={<Loader />}>
				<Container>
					<AccountTabs
						orders={user.Orders}
						addresses={user.Addresses}
						user={user}
					/>
				</Container>
			</Suspense>
		);
	}
}
