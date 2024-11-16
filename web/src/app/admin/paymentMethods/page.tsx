import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { formatDateTime, transformDecimalsToNumbers } from "@/lib/utils";
import { Suspense } from "react";
import { checkAdminAccess } from "../admin-utils";
import type { DataColumn } from "./components/columns";
import { DataClient } from "./components/data-client";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function PayMethodAdminPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const params = await props.params;
  checkAdminAccess();

  const methods = await sqlClient.paymentMethod.findMany({
    include: {
      StorePaymentMethodMapping: true,
      StoreOrder: true,
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
      payUrl: item.payUrl || "",
      priceDescr: item.priceDescr || "",
      fee: Number(item.fee) || 0,
      isDefault: item.isDefault,
      isDeleted: item.isDeleted,
      updatedAt: formatDateTime(item.updatedAt),
      StorePaymentMethodMapping: item.StorePaymentMethodMapping.length,
      StoreOrder: item.StoreOrder.length,
    };
  });

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <DataClient data={formattedData} />
      </Container>
    </Suspense>
  );
}
