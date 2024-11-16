import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { formatDateTime } from "@/lib/utils";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { User } from "@/types";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { UserColumn } from "./components/columns";
import { UsersClient } from "./components/user-client";

import { auth } from "@/auth";
import type { Session } from "next-auth";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// here we save store settings to mangodb
//
export default async function UsersAdminPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const params = await props.params;

  //console.log('storeid: ' + params.storeId);
  const session = (await auth()) as Session;
  const userId = session?.user.id;
  if (!session) {
    redirect(`${process.env.NEXT_PUBLIC_API_URL}/auth/signin`);
  }

  const users = await sqlClient.user.findMany({
    include: {
      Session: true,
      Orders: true,
      Account: true,
      Addresses: true,
      NotificationTo: {
        take: 0,
      },
    },
  });

  transformDecimalsToNumbers(users);

  //console.log(`users: ${JSON.stringify(users)}`);

  // map user to ui
  const formattedUsers: UserColumn[] = users.map((item: User) => {
    return {
      id: item.id,
      name: item.name || "",
      username: item.username || "",
      email: item.email || "",
      role: item.role || "",
      createdAt: formatDateTime(item.updatedAt),
      orders: item.Orders,
      currentlySignedIn: item.Session.length > 0,
    };
  });

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <UsersClient data={formattedUsers} />
      </Container>
    </Suspense>
  );
}
