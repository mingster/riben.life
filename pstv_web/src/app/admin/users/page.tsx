import { authOptions } from "@/auth";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { format } from "date-fns";
import { type Session, getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { UserColumn } from "./components/columns";
import { UsersClient } from "./components/user-client";
import type { User } from "@/types";
import { transformDecimalsToNumbers } from "@/lib/utils";

//import { Metadata } from 'next';
interface pageProps {
  params: {
    storeId: string;
  };
}

// here we save store settings to mangodb
//
const UsersAdminPage: React.FC<pageProps> = async ({ params }) => {
  //console.log('storeid: ' + params.storeId);
  const session = (await getServerSession(authOptions)) as Session;
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
      createdAt: format(item.updatedAt, "yyyy-MM-dd"),
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
};

export default UsersAdminPage;
