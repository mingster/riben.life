import Container from "@/components/ui/container";
import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
import type { Store } from "@prisma/client";

//import { Metadata } from 'next';
interface pageProps {
  params: {
    storeId: string;
  };
}

const CustomerMgmtPage: React.FC<pageProps> = async ({ params }) => {
  const store = (await checkStoreAccess(params.storeId)) as Store;

  return <Container>Customer Management</Container>;
};

export default CustomerMgmtPage;
