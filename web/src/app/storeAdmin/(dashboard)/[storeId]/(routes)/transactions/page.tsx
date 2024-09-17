import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";

import type { Store } from "@prisma/client";
import { StoreOrderClient } from "./components/store-order-client";
import type { StoreOrder } from "@/types";
import { format } from "date-fns";

//import { Metadata } from 'next';
interface pageProps {
  params: {
    storeId: string;
  };
}

const TransactionMgmtPage: React.FC<pageProps> = async ({ params }) => {
  /*
  const orders = (await sqlClient.storeOrder.findMany({
    where: {
      storeId: params.storeId,
    },
    include: {
      OrderNotes: true,
      OrderItemView: true,
      User: true,
      ShippingMethod: true,
      PaymentMethod: true,
    },
  })) as StoreOrder[];
*/
  //console.log(JSON.stringify(orders));

  return (
    <Container>
      <StoreOrderClient storeId={params.storeId} />
    </Container>
  );
};

export default TransactionMgmtPage;
