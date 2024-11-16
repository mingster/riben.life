"use server";

import { wipeoutDefaultData } from "@/actions/admin/populate-payship_defaults";
import sendStoreNotification, {
  type StoreNotification,
} from "@/actions/send-store-notification";
import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { DiamondPlus, Send, Trash } from "lucide-react";
import { checkAdminAccess } from "../admin-utils";

import fs from "node:fs";
import { redirect } from "next/navigation";
import { EditDefaultPrivacy } from "./edit-default-privacy";
import { EditDefaultTerms } from "./edit-default-terms";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// DashboardPage is home of the selected store. It diesplays store operatiing stat such as
//total revenue, sales count, products, etc..
export default async function StoreAdminDevMaintPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const params = await props.params;

  const isAdmin = (await checkAdminAccess()) as boolean;
  if (!isAdmin) redirect("/error/?code=500&message=Unauthorized");

  const deleteAllOrders = async () => {
    "use server";

    const { count } = await sqlClient.storeOrder.deleteMany({
      where: {
        //storeId: params.storeId,
      },
    });

    console.log(`${count} orders deleted.`);
    redirect("./");
  };

  const deleteAllSupportTickets = async () => {
    "use server";

    const { count } = await sqlClient.supportTicket.deleteMany({
      where: {
        //storeId: params.storeId,
      },
    });

    console.log(`${count} tickets deleted.`);
    redirect("./");
  };

  const sendTestNoficiation = async () => {
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

  const deleteAllShippingMethods = async () => {
    "use server";

    await sqlClient.shippingMethodPrice.deleteMany({});
    await sqlClient.storeShipMethodMapping.deleteMany({});
    //await sqlClient.shippingMethodPrice.deleteMany({});

    const { count } = await sqlClient.shippingMethod.deleteMany({
      where: {
        //storeId: params.storeId,
      },
    });
    console.log(`${count} shippingMethod deleted.`);

    redirect("./admin/maint");
  };

  const deleteAllPaymentMethods = async () => {
    "use server";

    const { count } = await sqlClient.paymentMethod.deleteMany({
      where: {
        //storeId: params.storeId,
      },
    });
    console.log(`${count} paymentMethod deleted.`);
    redirect("./admin/maint");
  };

  const storeOrderCount = await sqlClient.storeOrder.count();
  console.log(`storeOrderCount:${storeOrderCount}`);

  const ticketCount = await sqlClient.supportTicket.count();
  console.log(`ticketCount:${ticketCount}`);

  // populate defaults: privacy policy and terms of service
  //
  const termsfilePath = `${process.cwd()}/public/defaults/terms.md`;
  const tos = fs.readFileSync(termsfilePath, "utf8");

  const privacyfilePath = `${process.cwd()}/public/defaults/privacy.md`;
  const privacyPolicy = fs.readFileSync(privacyfilePath, "utf8");

  //console.log(tos);

  //<MaintClient storeId={store.id} />
  return (
    <Container>
      <div className="flex flex-row gap-3">
        <form action={deleteAllOrders}>
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            {...(storeOrderCount === 0 && { disabled: true })}
          >
            <Trash className="h-4 w-4 mr-1" /> Delete all order data
          </Button>
        </form>
        <form action={deleteAllSupportTickets}>
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            {...(ticketCount === 0 && { disabled: true })}
          >
            <Trash className="h-4 w-4 mr-1" /> Delete all Support Ticket data
          </Button>
        </form>
        <form action={sendTestNoficiation}>
          <Button type="submit" variant="default" size="sm">
            <Send className="h-4 w-4 mr-1" /> Send test nofication
          </Button>
        </form>
      </div>

      <EditDefaultPrivacy data={privacyPolicy} />
      <EditDefaultTerms data={tos} />
    </Container>
  );
}
