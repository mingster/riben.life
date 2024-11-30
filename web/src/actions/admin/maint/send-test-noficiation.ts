"use server";
import { sqlClient } from "@/lib/prismadb";

import sendStoreNotification, {
  type StoreNotification,
} from "@/actions/send-store-notification";

export const sendTestNoficiation = async () => {
  "use server";

  const obj = await sqlClient.storeNotification.create({
    data: {
      subject: "test",
      message: "test",
      Sender: {
        connect: {
          email: "mingster.tsai@gmail.com",
        },
      },
      Recipent: {
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
        Recipent: true,
        Sender: true,
      },
    });

  if (notifyTest) {
    sendStoreNotification(notifyTest);
  }
};
