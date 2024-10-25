import Container from "@/components/ui/container";

import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";

import { StoreOrderClient } from "./components/store-order-client";
import type { Store } from "@/types";

//import { Metadata } from 'next';
interface pageProps {
  params: {
    storeId: string;
  };
}

const TransactionMgmtPage: React.FC<pageProps> = async ({ params }) => {
  const store = (await checkStoreAccess(params.storeId)) as Store;

  return (
    <Container>
      <StoreOrderClient store={store} />
    </Container>
  );
};

export default TransactionMgmtPage;
