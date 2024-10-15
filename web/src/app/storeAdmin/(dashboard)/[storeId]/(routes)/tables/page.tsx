import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import type { Store } from "@/types";
import type { StoreTables } from "@prisma/client";
import { Suspense } from "react";
import type { TableColumn } from "./components/columns";
import { TableClient } from "./components/table-client";
import getStoreTables from "@/actions/get-store-tables";

//import { Metadata } from 'next';
interface pageProps {
  params: {
    storeId: string;
  };
}

//
const StoreTablePage: React.FC<pageProps> = async ({ params }) => {
  const store = (await checkStoreAccess(params.storeId)) as Store;

  const tables = (await getStoreTables(store.id)) as StoreTables[];

  // map FAQ Category to ui
  const formattedTables: TableColumn[] = tables.map((item: StoreTables) => ({
    id: item.id.toString(),
    storeId: store.id.toString(),
    tableName: item.tableName.toString(),
    capacity: item.capacity,
  }));

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <TableClient data={formattedTables} />
      </Container>
    </Suspense>
  );
};

export default StoreTablePage;
