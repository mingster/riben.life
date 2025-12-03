"use server";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

import sendStoreNotification, {
	type StoreNotification,
} from "@/actions/send-store-notification";

export const sendTestNoficiation = async () => {
	"use server";

	const obj = await sqlClient.storeNotification.create({
		data: {
			subject: "test",
			message: "test",
			createdAt: getUtcNowEpoch(),
			updatedAt: getUtcNowEpoch(),
			Sender: {
				connect: {
					email: "mingster.tsai@gmail.com",
				},
			},
			Recipient: {
				connect: {
					email: "mingster.tsai@gmail.com",
				},
			},
		},
	});

	const notifyTest: StoreNotification | null =
		await sqlClient.storeNotification.findUnique({
			where: {
				id: obj.id,
			},
			include: {
				Recipient: true,
				Sender: true,
			},
		});

	if (notifyTest) {
		sendStoreNotification(notifyTest);
	}
};
