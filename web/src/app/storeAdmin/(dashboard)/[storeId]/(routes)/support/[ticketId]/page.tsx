"use server";

import { sqlClient } from "@/lib/prismadb";
import { DisplayThread } from "./display-thread";
import { TicketReply } from "./ticket-reply";
import { Suspense } from "react";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";

//import { Metadata } from 'next';
interface pageProps {
  params: {
    storeId: string;
    ticketId: string;
  };
}
const TicketEditPage: React.FC<pageProps> = async ({ params }) => {
  const ticket = await sqlClient.supportTicket.findUnique({
    where: {
      id: params.ticketId,
    },
  });

  //console.log(`ProductPa//ge: ${JSON.stringify(product)}`);
  let action = "Reply";
  if (ticket === null) action = "New";

  // get thread for this ticket
  const thread = await sqlClient.supportTicket.findMany({
    where: {
      threadId: ticket?.threadId,
    },
    include: {
      Sender: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
  //console.log(`thread: ${JSON.stringify(thread)}`);

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <div className="flex-col">
          <div className="flex-1 space-y-4 p-8 pt-6">
            {
              // if there's thread, display them along with reply form
              ticket !== null ? (
                <>
                  <DisplayThread thread={thread} />
                  <TicketReply initialData={ticket} />
                </>
              ) : (
                <>
                  {/* otherwise display create form <TicketCreate initialData={null} />*/}
                </>
              )
            }
          </div>
        </div>
      </Container>
    </Suspense>
  );
};

export default TicketEditPage;
