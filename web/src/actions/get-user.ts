import { auth } from "@/auth";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
//import { User } from 'prisma/prisma-client';
import type { User } from "@/types";
import type { StoreTables } from "@prisma/client";

const getUser = async (): Promise<User | null> => {
  const session = await auth();
  if (!session) {
    return null;
  }

  const obj = await sqlClient.user.findUnique({
    where: {
      id: session.user.id,
    },
    include: {
      /*
      NotificationTo: {
        take: 20,
        include: {
          Sender: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      },*/
      Addresses: true,
      Orders: {
        include: {
          ShippingMethod: true,
          PaymentMethod: true,
          OrderItemView: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
      Session: true,
      Account: true,
    },
  });

  if (obj) {
    transformDecimalsToNumbers(obj);
  }

  return obj;

  /*
      // mock tableId to its display name
    for (const order of obj.Orders) {
      console.log('tableId', order.tableId);

      if (order.tableId && order.tableId !== "" && order.tableId !== null) {
        const table = (await sqlClient.storeTables.findUnique({
          where: {
            id: order.tableId,
          },
        })) as StoreTables;

        order.tableId = table.tableName;
      }
    }


  //get user with needed assoicated objects
  //
  const userid = session?.user.id;
  const URL = `${process.env.NEXT_PUBLIC_API_URL}/user/${userid}/userobj`;

  //const user = (await axios.get(URL).then((response) => response.data)) as User;
  //console.log(JSON.stringify(user));

  const env = process.env.NODE_ENV;

  if (env === 'development') {
  const res = await fetch(`${URL}`, {
    cache: 'no-store',
  });

  return res.json();
  } else {
  //cache lifetime in 1 hour
  const res = await fetch(`${URL}`, { next: { revalidate: 3600 } });
  return res.json();
  }
  */
};

export default getUser;
