"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Heading } from "@/components/ui/heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type {
	Category,
	Product,
	Store,
	StoreAnnouncement,
	StoreOrder,
	StoreSubscription,
	User,
} from "@prisma/client";
import { StoreEditBasicTab } from "./store-edit-basic-tab";
import { StoreSubscrptionTab } from "./store-subscription";

interface editProps {
	initialData: Store & {
		Categories: Category[] | [];
		StoreAnnouncement: StoreAnnouncement[] | [];
		Owner: User;
		Products: Product[] | [];
		StoreOrders: StoreOrder[] | [];
	};
	action: string;
	subscription: StoreSubscription | null;
}
export const StoreEditTabs = ({
	initialData,
	action,
	subscription,
}: editProps) => {
	//const params = useParams();

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<>
			<Heading
				title={t("store_settings")}
				description={t("store_settings_descr")}
			/>
			<Tabs defaultValue="basic" className="w-full">
				<TabsList>
					<TabsTrigger className="px-5 lg:min-w-40" value="basic">
						{t("store_settings_tab_basic")}
					</TabsTrigger>

					<TabsTrigger className="px-5 lg:min-w-40" value="subscription">
						Subscrption
					</TabsTrigger>
				</TabsList>

				<TabsContent value="basic">
					<StoreEditBasicTab initialData={initialData} action={action} />
				</TabsContent>
				<TabsContent value="subscription">
					<StoreSubscrptionTab
						initialData={initialData}
						subscription={subscription}
					/>
				</TabsContent>
			</Tabs>
		</>
	);
};
