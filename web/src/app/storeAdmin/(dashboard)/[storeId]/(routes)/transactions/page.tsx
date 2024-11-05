import Container from "@/components/ui/container";

import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";

import { TransactionClient } from "./components/transaction-client";
import type { Store, StoreOrder } from "@/types";
import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { StoreOrderColumn } from "./components/columns";
import { format } from "date-fns";

//import { Metadata } from 'next';
interface pageProps {
  params: {
    storeId: string;
  };
}

const TransactionMgmtPage: React.FC<pageProps> = async ({ params }) => {
  const store = (await checkStoreAccess(params.storeId)) as Store;

  const orders = (await sqlClient.storeOrder.findMany({
    where: {
      storeId: store.id,
    },
    include: {
      //Store: true,
      OrderNotes: true,
      OrderItemView: true,
      User: true,
      ShippingMethod: true,
      PaymentMethod: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  })) as StoreOrder[];

  transformDecimalsToNumbers(orders);

  // map order to ui
  const formattedData: StoreOrderColumn[] = orders.map((item: StoreOrder) => ({
    id: item.id,
    user: item.User?.username || "",
    orderStatus: item.orderStatus || 0,
    amount: Number(item.orderTotal),
    currency: item.currency,
    isPaid: item.isPaid,
    updatedAt: format(item.updatedAt, "yyyy-MM-dd HH:mm:ss"),
    paymentMethod: item.PaymentMethod?.name,
    shippingMethod: item.ShippingMethod.name,
    //tableId: item.tableId,
    orderNum: Number(item.orderNum),
    paymentCost: Number(item.paymentCost) || 0,
    note: item.OrderNotes[0]?.note || "",
  }));

  return (
    <Container>
      <TransactionClient store={store} data={formattedData} />
    </Container>
  );
};

export default TransactionMgmtPage;
