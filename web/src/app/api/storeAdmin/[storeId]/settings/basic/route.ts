import { sqlClient, mongoClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { IsSignInResponse } from "@/lib/auth/utils";

export async function PATCH(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    CheckStoreAdminApiAccess(params.storeId);

    const userId = await IsSignInResponse();
    if (typeof userId !== "string") {
      return new NextResponse("Unauthenticated", { status: 400 });
    }

    const body = await req.json();

    const {
      name,
      orderNoteToCustomer,
      defaultLocale,
      defaultCountry,
      defaultCurrency,
      autoAcceptOrder,
      isOpen,
      acceptAnonymousOrder,
      useBusinessHours,
      businessHours,
      requireSeating,
      requirePrepay,
    } = body;

    if (!body.name) {
      return new NextResponse("Name is required", { status: 403 });
    }

    /*
    const locale = await prismadb.locale.findUnique({ where: { id: defaultLocale } });
    const defaultCurrency = locale?.defaultCurrencyId;
    */

    const store = await sqlClient.store.update({
      where: {
        id: params.storeId,
        ownerId: userId,
      },
      data: {
        name,
        defaultLocale,
        defaultCountry,
        defaultCurrency,
        autoAcceptOrder,
        acceptAnonymousOrder,
        useBusinessHours,
        isOpen,
        requireSeating,
        requirePrepay,
        updatedAt: new Date(Date.now()),
        /*
        storeLocales: {
          upsert: {
            // create or update storeLocale record
            create: { localeId: defaultLocale! },
            update: { localeId: defaultLocale! },
            where: { storeId_localeId: { storeId: params.storeId, localeId: defaultLocale } },
          },
        },
        */
      },
    });

    const storeSettings = await mongoClient.storeSettings.upsert({
      where: {
        databaseId: params.storeId,
      },
      update: {
        orderNoteToCustomer,
        businessHours,
        updatedAt: new Date(Date.now()),
      },
      create: {
        orderNoteToCustomer,
        businessHours,
        databaseId: params.storeId,
      },
    });

    return NextResponse.json(store);
  } catch (error) {
    console.log("[STORE_PATCH]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    CheckStoreAdminApiAccess(params.storeId);

    const userId = await IsSignInResponse();
    if (typeof userId !== "string") {
      return new NextResponse("Unauthenticated", { status: 400 });
    }

    // make sure store belongs to the user
    const storeToUpdate = await sqlClient.store.findUnique({
      where: {
        id: params.storeId,
        ownerId: userId,
      },
      include: {
        //Categories: true,
        //StoreAnnouncement: true,
        //Owner: true,
        Products: true,
        StoreOrders: true,
        //StoreShippingMethods: true,
        //StorePaymentMethods: true,
      },
    });

    if (!storeToUpdate) {
      return new NextResponse("error", { status: 402 });
    }

    // delete the store if no order exists.
    if (storeToUpdate.StoreOrders.length === 0) {
      // remove store from mongodb
      const storeSetting = await mongoClient.storeSettings.findFirst({
        where: {
          databaseId: storeToUpdate.id,
        },
      });

      if (storeSetting) {
        try {
          await mongoClient.address.delete({
            where: {
              storeSettingsId: storeSetting.id,
            },
          });
        } catch (error) {
          console.log(error);
        }

        await mongoClient.storeSettings.delete({
          where: {
            databaseId: storeToUpdate.id,
          },
        });
      }

      await sqlClient.storePaymentMethodMapping.deleteMany({
        where: {
          storeId: params.storeId,
        },
      });
      await sqlClient.storeShipMethodMapping.deleteMany({
        where: {
          storeId: params.storeId,
        },
      });

      const store = await sqlClient.store.delete({
        where: {
          id: params.storeId,
        },
      });

      return NextResponse.json(store);
    }

    // mark store as deleted only
    const store = await sqlClient.store.update({
      where: {
        id: params.storeId,
      },
      data: {
        isDeleted: true,
      },
    });
    return NextResponse.json(store);
  } catch (error) {
    console.log("[STORE_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
