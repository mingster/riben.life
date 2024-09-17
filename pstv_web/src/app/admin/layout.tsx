import { authOptions } from "@/auth";
import { Toaster } from "@/components/ui/toaster";
import { type Session, getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import AdminPanelLayout from "./components/admin-panel-layout";

export default async function AdminDashboardLayout({
  children,
  //params,
}: {
  children: React.ReactNode;
  //params: { storeId: string };
}) {
  const session = (await getServerSession(authOptions)) as Session;
  //console.log('session: ' + JSON.stringify(session));
  //console.log('userid: ' + userId);

  if (!session) {
    redirect(`${process.env.NEXT_PUBLIC_API_URL}/auth/signin`);
  }

  //console.log('userId: ' + user?.id);
  /*
  if (session.user.role !== "ADMIN") {
    console.log("access denied");
    redirect("/error/?code=500");
  }
  
  */
  return (
    <AdminPanelLayout>
      {children}
      <Toaster />
    </AdminPanelLayout>
  );
}
