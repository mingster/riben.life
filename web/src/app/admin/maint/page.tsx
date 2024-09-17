"use server";

import { populateCountryData } from "@/actions/admin/populate-country-data";
import { populateCurrencyData } from "@/actions/admin/populate-currency-data";
import {
  create_locales,
  create_paymentMethods,
  create_shippingMethods,
  wipeoutDefaultData,
} from "@/actions/admin/populate-payship_defaults";
import sendStoreNotification, {
  type StoreNotification,
} from "@/actions/send-store-notification";
import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { DiamondPlus, Send, Trash } from "lucide-react";
import { checkAdminAccess } from "../admin-utils";

import fs from "node:fs";
import { EditDefaultPrivacy } from "./edit-default-privacy";
import { EditDefaultTerms } from "./edit-default-terms";
import { redirect } from "next/navigation";

interface props {
  params: {
    storeId: string;
  };
}

// DashboardPage is home of the selected store. It diesplays store operatiing stat such as
//total revenue, sales count, products, etc..
const StoreAdminDevMaintPage: React.FC<props> = async ({ params }) => {
  checkAdminAccess();

  const deleteAllOrders = async () => {
    "use server";

    const { count } = await sqlClient.storeOrder.deleteMany({
      where: {
        //storeId: params.storeId,
      },
    });

    console.log(`${count} orders deleted.`);
    redirect("./admin/maint");
  };
  const deleteAllSupportTickets = async () => {
    "use server";

    const { count } = await sqlClient.supportTicket.deleteMany({
      where: {
        //storeId: params.storeId,
      },
    });

    console.log(`${count} tickets deleted.`);
    redirect("./admin/maint");
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

  const countryCount = await sqlClient.country.count();
  console.log(`countryCount:${countryCount}`);

  const currencyCount = await sqlClient.currency.count();
  console.log(`currencyCount:${currencyCount}`);

  const paymentMethods = await sqlClient.paymentMethod.findMany();
  console.log(`paymentMethods:${JSON.stringify(paymentMethods)}`);

  const shippingMethods = await sqlClient.shippingMethod.findMany();
  console.log(`shippingMethods:${JSON.stringify(shippingMethods)}`);

  const localeCount = await sqlClient.locale.count();
  console.log(`localeCount:${localeCount}`);

  const shippingMethodCount = await sqlClient.shippingMethod.count();
  console.log(`shippingMethodCount:${shippingMethodCount}`);

  const paymentMethodCount = await sqlClient.paymentMethod.count();
  console.log(`paymentMethodCount:${paymentMethodCount}`);

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

      <div className="flex flex-row gap-3 pt-5">
        <form action={wipeoutDefaultData}>
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            {...(currencyCount === 0 && { disabled: true })}
          >
            <Trash className="h-4 w-4 mr-1" /> wipe out default data
          </Button>
        </form>

        <form action={deleteAllShippingMethods}>
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            {...(shippingMethodCount === 0 && { disabled: true })}
          >
            <Trash className="h-4 w-4 mr-1" /> wipe out Shipping Method
          </Button>
        </form>

        <form action={deleteAllPaymentMethods}>
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            {...(paymentMethodCount === 0 && { disabled: true })}
          >
            <Trash className="h-4 w-4 mr-1" /> wipe out payment Method
          </Button>
        </form>
      </div>

      <div className="flex flex-row gap-3 pt-5">
        <div className="flex">
          <form action={populateCurrencyData}>
            <Button
              type="submit"
              variant="default"
              size="sm"
              {...(currencyCount !== 0 && { disabled: true })}
            >
              <DiamondPlus className="h-4 w-4 mr-1" /> Populate currency
              defaults
            </Button>
          </form>
        </div>

        <div className="flex">
          <form action={populateCountryData}>
            <Button
              type="submit"
              variant="default"
              size="sm"
              {...(countryCount !== 0 && { disabled: true })}
            >
              <DiamondPlus className="h-4 w-4 mr-1" /> Populate country defaults
            </Button>
          </form>
        </div>

        <div className="flex">
          <form action={create_locales}>
            <Button
              type="submit"
              variant="default"
              size="sm"
              {...(localeCount !== 0 && { disabled: true })}
            >
              <DiamondPlus className="h-4 w-4 mr-1" /> Populate locale defaults
            </Button>
          </form>
        </div>

        <div className="flex">
          <form action={create_shippingMethods}>
            <Button
              type="submit"
              variant="default"
              size="sm"
              {...(shippingMethodCount !== 0 && { disabled: true })}
            >
              <DiamondPlus className="h-4 w-4 mr-1" /> Populate shippingMethod
              defaults
            </Button>
          </form>
        </div>

        <div className="flex">
          <form action={create_paymentMethods}>
            <Button
              type="submit"
              variant="default"
              size="sm"
              {...(paymentMethodCount !== 0 && { disabled: true })}
            >
              <DiamondPlus className="h-4 w-4 mr-1" /> Populate paymentMethod
              defaults
            </Button>
          </form>
        </div>
      </div>

      <EditDefaultPrivacy data={privacyPolicy} />
      <EditDefaultTerms data={tos} />
    </Container>
  );
};

export default StoreAdminDevMaintPage;
