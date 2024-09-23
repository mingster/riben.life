import { Toaster } from "@/components/ui/toaster";
//import { Metadata } from 'next';
//import { mongoClient, sqlClient } from '@/lib/prismadb';

import { Loader } from "@/components/ui/loader";
import { mongoClient, sqlClient } from "@/lib/prismadb";
import type { Store } from "@/types";
import { Suspense } from "react";
import { StoreFooter } from "./components/store-footer";
import { StoreNavbar } from "./components/store-navbar";
import type { StoreSettings } from "@prisma-mongo/prisma/client";

import type { Metadata, ResolvingMetadata } from "next";
import { transformDecimalsToNumbers } from "@/lib/utils";
import BusinessHours from "@/lib/businessHours";
import { redirect } from "next/navigation";
type Props = {
  params: { storeId: string };
  searchParams: { [key: string]: string | string[] | undefined }
};

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  if (!params.storeId) {
    return {
      title: "riben.life",
    };
  }

  // read route params
  const store = (await sqlClient.store.findFirst({
    where: {
      id: params.storeId,
    },
    include: {
      Categories: {
        where: { isFeatured: true },
        orderBy: { sortOrder: "asc" },
      },
      StoreAnnouncement: true,
    },
  })) as Store;

  //if (!store) return { title: "riben.life" };

  return {
    title: store.name,
    //keywords: searchParams.keywords,
  };
}

export default async function StoreHomeLayout({
  params,
  children, // will be a page or nested layout
}: {
  params: {
    storeId: string;
  };
  children: React.ReactNode;
}) {
  const store = (await sqlClient.store.findFirst({
    where: {
      id: params.storeId,
    },
    include: {
      Categories: {
        where: { isFeatured: true },
        orderBy: { sortOrder: "asc" },
      },
      StoreAnnouncement: true,
    },
  })) as Store;

  transformDecimalsToNumbers(store);

  const storeSettings = (await mongoClient.storeSettings.findFirst({
    where: {
      databaseId: params.storeId,
    },
  })) as StoreSettings;
  //console.log(JSON.stringify(store));

  if (store === null) {
    redirect("/storeAdmin");
    //return <Loader/>;
    //throw new Error("store not found");
  }

  let isStoreOpen = store.isOpen;
  const bizHour = storeSettings.businessHours;
  if (store.useBusinessHours && bizHour !== null) {
    const businessHours = new BusinessHours(bizHour);
    isStoreOpen = businessHours.isOpenNow();
  }

  return (
    <Suspense fallback={<Loader />}>
      <div className="bg-repeat bg-[url('/images/beams/hero@75.jpg')] dark:bg-[url('/images/beams/hero-dark@90.jpg')]">
        <StoreNavbar visible={true} store={store} />
        <main>
          <span className="hash-span" id="top" />
          {children}
        </main>
        <StoreFooter visible={isStoreOpen} store={store} />
      </div>
      <Toaster />
    </Suspense>
  );
}
