import { authOptions } from "@/auth";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { TicketStatus } from "@/types/enum";
import type { SupportTicket } from "@prisma/client";
import { format } from "date-fns";
import { type Session, getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { TicketColumn } from "./components/columns";
import { TicketClient } from "./components/ticket-client";

interface pageProps {
  params: {
    storeId: string;
  };
}
const StoreSupportPage: React.FC<pageProps> = async ({ params }) => {
  const session = (await getServerSession(authOptions)) as Session;
  const userId = session?.user.id;

  if (!session) {
    redirect(`${process.env.NEXT_PUBLIC_API_URL}/auth/signin`);
  }

  const store = await sqlClient.store.findFirst({
    where: {
      id: params.storeId,
    },
  });

  if (!store) {
    redirect("/unv");
  }

  const tickets = await sqlClient.supportTicket.findMany({
    distinct: ["threadId"],
    where: {
      senderId: userId,
      storeId: store.id,
      status: { in: [TicketStatus.Open, TicketStatus.Active] },
    },
    include: {},
    orderBy: {
      updatedAt: "desc",
    },
  });

  // map tickets to ui
  const formattedTickets: TicketColumn[] = tickets.map(
    (item: SupportTicket) => ({
      id: item.id,
      department: item.department,
      subject: item.subject,
      status: item.status,
      updatedAt: format(item.updatedAt, "yyyy-MM-dd"),
    }),
  );

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <TicketClient data={formattedTickets} store={store} />
      </Container>
    </Suspense>
  );
};
export default StoreSupportPage;
