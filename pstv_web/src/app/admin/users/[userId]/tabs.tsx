"use client";

import { useI18n } from "@/providers/i18n-provider";

import { Heading } from "@/components/ui/heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { Account, Session, StoreOrder, User } from "@prisma/client";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { UserEditBasicTab } from "./user-edit-basic-tab";

interface editProps {
  initialData:
    | (User & {
        Order: StoreOrder[] | [];
        Session: Session[] | [];
        Account: Account | null;
      })
    | null;
  action: string;
}
export const UserEditTabs = ({ initialData, action }: editProps) => {
  const params = useParams();
  const { lng } = useI18n();
  const { t } = useTranslation(lng);
  //product.storeId = `${params.storeId}`;
  return (
    <>
      <Heading
        title={`${action} User`}
        description="Manage user in the system."
      />
      <Tabs defaultValue="basic" className="w-full">
        <TabsList>
          <TabsTrigger className="pl-5 pr-5 lg:min-w-40" value="basic">
            User
          </TabsTrigger>
          <TabsTrigger className="pl-5 pr-5 lg:min-w-40" value="attribute">
            Session
          </TabsTrigger>
          <TabsTrigger className="pl-5 pr-5 lg:min-w-40" value="images">
            Account
          </TabsTrigger>
        </TabsList>
        <TabsContent value="basic">
          <UserEditBasicTab initialData={initialData} action={action} />
        </TabsContent>
      </Tabs>
    </>
  );
};
