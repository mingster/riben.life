import { authOptions } from "@/auth";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { mongoClient, sqlClient } from "@/lib/prismadb";
import { type Session, getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export const checkAdminAccess = async () => {
  //console.log('storeid: ' + params.storeId);
  const session = (await getServerSession(authOptions)) as Session;
  const userId = session?.user.id;

  if (!session) {
    redirect(`${process.env.NEXT_PUBLIC_API_URL}/auth/signin`);
  }

  if (!userId) {
    redirect(`${process.env.NEXT_PUBLIC_API_URL}/auth/signin`);
  }

  if (session.user.role !== "ADMIN") {
    redirect("/error/?code=500&message=Unauthorized");
  }
};
