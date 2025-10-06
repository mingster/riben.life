"use client";

import { useI18n } from "@/providers/i18n-provider";

import { Heading } from "@/components/ui/heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { User } from "@/types";
import type { Account, Session } from "@prisma/client";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import SettingsTab from "./user-edit-basic-tab";

interface editProps {
	initialData:
		| (User & {
				Session: Session[] | [];
				Account: Account | null;
		  })
		| null;
	action: string;
}
export const UserEditTabs = ({ initialData, action }: editProps) => {
	const _params = useParams();
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
					<TabsTrigger className="px-5 lg:min-w-40" value="basic">
						User
					</TabsTrigger>
					<TabsTrigger className="px-5 lg:min-w-40" value="attribute">
						Session
					</TabsTrigger>
					<TabsTrigger className="px-5 lg:min-w-40" value="images">
						Account
					</TabsTrigger>
				</TabsList>
				<TabsContent value="basic">
					<SettingsTab user={initialData} />
				</TabsContent>
			</Tabs>
		</>
	);
};
