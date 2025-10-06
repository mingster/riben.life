//import { auth } from "@/auth";

import getUser from "@/actions/get-user";
import type { StoreNotification } from "@/actions/send-store-notification";

import Container from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import type { User } from "@/types";
import { formatDateTime } from "@/utils/datetime-utils";
import { IconMessageCircle } from "@tabler/icons-react";
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { auth } from "@/lib/auth";

export const metadata: Metadata = {
	title: "My Notification",
};

const UserNotificationPage: React.FC = async () => {
	return null;
	/*
	const user = await getUser();

	//const { t } = await useTranslation(user?.locale || "en");

	if (!user) {
		redirect(`/signin`);
	} else {
		const _u: User = user as User;
		//console.log(`user: ${JSON.stringify(u)}`);
const session = await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	});
		const notifications = session?.user?.NotificationTo;
		if (notifications === null) return;

		//console.log(`notifcations: ${JSON.stringify(session.user.notifications)}`);

		const avatarPlaceholder = "/images/user/avatar_placeholder.png";

		// mark all notification as read
		//
		await sqlClient.storeNotification.updateMany({
			where: {
				id: {
					in: notifications.map((n: StoreNotification) => n.id),
				},
			},
			data: {
				isRead: true,
			},
		});

		const title = "Notification";
		//const title = t("notification");
		//console.log(`title: ${title}`);

		return (
			<Suspense fallback={<Loader />}>
				<Container>
					<Heading title={title} description={""} />

					<div className="w-full">
						{notifications.map((obj: StoreNotification) => (
							<div
								key={obj.id}
								className="flex flex-row gap-5 border-collapse pb-5"
							>
								<div className="pl-1 max-w-120">
									<div className="basis-1/3 flex gap-2">
										<Image
											src={obj.Sender?.image || avatarPlaceholder}
											alt="User profile picture"
											width={30}
											height={30}
											className="aspect-square rounded-full bg-background object-cover hover:opacity-50"
										/>
										<span className="text-sm">{obj.Sender.name}</span>
									</div>
								</div>

								<div>
									<div className="flex">
										<IconMessageCircle className="size-6 pr-2" />
										{obj.subject}
									</div>
									<div>{obj.message}</div>

									<div className="text-xs">{formatDateTime(obj.updatedAt)}</div>
								</div>
							</div>
						))}
					</div>
				</Container>
			</Suspense>
		);
	}
	*/
};
export default UserNotificationPage;
