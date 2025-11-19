"use client";

import { Store } from "@/types";
import { RsvpSettingTab } from "./setting-rsvp-tab";

import { toastError, toastSuccess } from "@/components/toaster";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { IconTrash } from "@tabler/icons-react";
import { type AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Button } from "@/components/ui/button";

import { Loader } from "@/components/loader";
import { AlertModal } from "@/components/modals/alert-modal";
import { Heading } from "@/components/ui/heading";

export interface RsvpSettingsProps {
	store: Store;
	rsvpSettings?: {
		id: string;
		storeId: string;
		acceptReservation: boolean;
		prepaidRequired: boolean;
		prepaidAmount: number | null;
		canCancel: boolean;
		cancelHours: number;
		defaultDuration: number;
		requireSignature: boolean;
		showCostToCustomer: boolean;
		useBusinessHours: boolean;
		rsvpHours: string | null;
		reminderHours: number;
		useReminderSMS: boolean;
		useReminderLine: boolean;
		useReminderEmail: boolean;
		syncWithGoogle: boolean;
		syncWithApple: boolean;
		createdAt: Date;
		updatedAt: Date;
	} | null;
	onStoreUpdated?: (store: Store) => void;
}

export const RsvpSettingTabs: React.FC<RsvpSettingsProps> = ({
	store,
	rsvpSettings,
	onStoreUpdated,
}) => {
	const router = useRouter();
	const params = useParams();

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	if (loading) {
		return <Loader />;
	}

	return (
		<>
			<div className="flex items-center justify-between">
				<Heading
					title={t("RSVP_Settings")}
					description={t("RSVP_Settings_Descr")}
				/>
			</div>

			<Tabs defaultValue="basic" className="w-full">
				<TabsList>
					<TabsTrigger className="px-1 lg:min-w-25" value="basic">
						{t("RSVP_Tab_System")}
					</TabsTrigger>
					<TabsTrigger className="px-1 lg:min-w-25" value="credit">
						{t("RSVP_Tab_Credit")}
					</TabsTrigger>

					<TabsTrigger className="px-1 lg:min-w-25" value="tag">
						{t("RSVP_Tab_Tag")}
					</TabsTrigger>

					<TabsTrigger className="px-1 lg:min-w-25" value="blacklist">
						{t("RSVP_Tab_Blacklist")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="basic">
					<RsvpSettingTab
						store={store}
						rsvpSettings={rsvpSettings}
						onStoreUpdated={onStoreUpdated}
					/>
				</TabsContent>
			</Tabs>
		</>
	);
};
