"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Heading } from "@/components/ui/heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type {
	Account,
	Category,
	Product,
	Session,
	Store,
	StoreAnnouncement,
	StoreOrder,
	User,
} from "@prisma/client";
import { useParams } from "next/navigation";
import { StoreEditBasicTab } from "./store-edit-basic-tab";

interface editProps {
	initialData: Store & {
		Categories: Category[] | [];
		StoreAnnouncement: StoreAnnouncement[] | [];
		Owner: User;
		Products: Product[] | [];
		StoreOrders: StoreOrder[] | [];
	};
	action: string;
}
export const StoreEditTabs = ({ initialData, action }: editProps) => {
	const params = useParams();

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	return (
		<>
			<Heading
				title={t("StoreSettings")}
				description={t("StoreSettingsDescr")}
			/>
			<Tabs defaultValue="basic" className="w-full">
				<TabsList>
					<TabsTrigger className="px-5 lg:min-w-40" value="basic">
						{t("StoreSettingsTab_Basic")}
					</TabsTrigger>
				</TabsList>
				<TabsContent value="basic">
					<StoreEditBasicTab initialData={initialData} action={action} />
				</TabsContent>
			</Tabs>
		</>
	);
};
