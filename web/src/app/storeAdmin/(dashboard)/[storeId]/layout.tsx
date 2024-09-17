//import { Metadata } from 'next';
import { type Session, getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Store } from "@/types";

import { authOptions } from "@/auth";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { Suspense } from "react";
import type { Metadata, ResolvingMetadata } from "next";

type Props = {
  params: { storeId: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  if (!params.storeId) {
    return {
      title: "pstv",
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

  if (!store) return { title: "pstv" };

  return {
    title: `${store.name} - administration`,
  };
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { storeId: string };
}) {
  const session = (await getServerSession(authOptions)) as Session;
  //console.log('session: ' + JSON.stringify(session));
  //console.log('userid: ' + userId);

  if (!session) {
    redirect(`${process.env.NEXT_PUBLIC_API_URL}/auth/signin`);
  }

  if (!params.storeId) {
    // this will allow the user to set up a store
    redirect("/storeAdmin/");
  }

  const store = await sqlClient.store.findFirst({
    where: {
      id: params.storeId,
      ownerId: session.user?.id,
    },
  });

  if (!store) {
    console.log("no access to the store...redirect to store creation page.");
    redirect("/storeAdmin");
  }

  return <Suspense fallback={<Loader />}>{children}</Suspense>;
}
