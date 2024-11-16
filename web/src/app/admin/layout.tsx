import { Toaster } from "@/components/ui/toaster";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import type { Session } from "next-auth";

import "../css/base.css";
import "../css/utilities.css";

import { checkAdminAccess } from "./admin-utils";
import AdminPanelLayout from "./components/admin-panel-layout";

export default async function AdminDashboardLayout({
  children,
  //params,
}: {
  children: React.ReactNode;
  //params: { storeId: string };
}) {
  const isAdmin = (await checkAdminAccess()) as boolean;
  if (!isAdmin) redirect("/error/?code=500&message=Unauthorized");

  return (
    <AdminPanelLayout>
      {children}
      <Toaster />
    </AdminPanelLayout>
  );
}
