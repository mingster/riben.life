import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { format } from "date-fns";
import { Suspense } from "react";
import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
import type { Store, StoreAnnouncement } from "@prisma/client";
import type { MessageColumn } from "./components/columns";
import { MessageClient } from "./components/message-client";

//import { Metadata } from 'next';
interface pageProps {
  params: {
    storeId: string;
  };
}

// here we save store settings to mangodb
//
const AnnouncementsAdminPage: React.FC<pageProps> = async ({ params }) => {
  const store = (await checkStoreAccess(params.storeId)) as Store;

  const messages = await sqlClient.storeAnnouncement.findMany({
    where: {
      storeId: store.id,
    },
    orderBy: {
      updatedAt: "asc",
    },
  });

  // map FAQ Category to ui
  const formattedMessages: MessageColumn[] = messages.map(
    (item: StoreAnnouncement) => ({
      id: item.id.toString(),
      storeId: store.id.toString(),
      message: item.message.toString(),
      updatedAt: format(item.updatedAt, "yyyy-MM-dd"),
    }),
  );

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <MessageClient data={formattedMessages} />
      </Container>
    </Suspense>
  );
};

export default AnnouncementsAdminPage;
