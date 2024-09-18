import { Toaster } from "@/components/ui/toaster";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import type { Session } from "next-auth";

import "../css/font.css";
import "../css/base.css";
import "../css/utilities.css";

import AdminPanelLayout from "./components/admin-panel-layout";
import { RequiresSignIn } from "@/utils/auth-utils";

export default async function AdminDashboardLayout({
  children,
  //params,
}: {
  children: React.ReactNode;
  //params: { storeId: string };
}) {
  const session = await RequiresSignIn();

  /*
  //const session = (await auth()) as Session;
  //console.log('session: ' + JSON.stringify(session));
  //console.log('userid: ' + userId);

  if (!session) {
    redirect(`${process.env.NEXT_PUBLIC_API_URL}/auth/signin`);
  }
  */

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
