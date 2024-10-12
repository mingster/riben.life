import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { format } from "date-fns";

import { Suspense } from "react";
import type { DataColumn } from "./components/columns";
import { DataClient } from "./components/data-client";
import { checkAdminAccess } from "../admin-utils";
import { transformDecimalsToNumbers } from "@/lib/utils";

const PayMethodAdminPage: React.FC = async () => {
  checkAdminAccess();

  const methods = await sqlClient.shippingMethod.findMany({
    include: {
      stores: true,
      StoreOrder: true,
      Shipment: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  transformDecimalsToNumbers(methods);

  //console.log(`users: ${JSON.stringify(users)}`);
  // map stores to UI format
  const formattedData: DataColumn[] = methods.map((item) => {
    return {
      id: item.id,
      name: item.name || "",
      currencyId: item.currencyId || "",
      basic_price: Number(item.basic_price) || 0,
      isDefault: item.isDefault,
      isDeleted: item.isDeleted,
      shipRequried: item.shipRequried,
      updatedAt: format(item.updatedAt, "yyyy-MM-dd"),
      stores: item.stores.length,
      StoreOrder: item.StoreOrder.length,
      Shipment: item.Shipment.length,
    };
  });

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <DataClient data={formattedData} />
      </Container>
    </Suspense>
  );
};

export default PayMethodAdminPage;
