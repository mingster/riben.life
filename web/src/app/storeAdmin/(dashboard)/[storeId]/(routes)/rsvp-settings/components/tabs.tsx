"use client";

import { Store } from "@/types";
import { RsvpSettingTab } from "./tab-rsvp-settings";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Loader } from "@/components/loader";
import { Heading } from "@/components/ui/heading";
import { RsvpCreditTab } from "./tab-credit";
import { RsvpTagTab } from "./tab-tag";
import { RsvpBlacklistTab } from "./tab-black-list";

export type RsvpSettingsData = {
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
};

export interface RsvpSettingsProps {
	store: Store;
	rsvpSettings?: RsvpSettingsData | null;
	onStoreUpdated?: (store: Store) => void;
}

export const RsvpSettingTabs: React.FC<RsvpSettingsProps> = ({
	store: initialStore,
	rsvpSettings: initialRsvpSettings,
	onStoreUpdated,
}) => {
	const router = useRouter();
	const params = useParams();

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	// Manage rsvpSettings state in client component
	const [rsvpSettings, setRsvpSettings] = useState(initialRsvpSettings);

	// Manage store state in client component
	const [store, setStore] = useState(initialStore);

	// Handle updated rsvpSettings
	const handleRsvpSettingsUpdated = (
		updated: NonNullable<typeof rsvpSettings>,
	) => {
		setRsvpSettings(updated);
	};

	// Handle updated store
	const handleStoreUpdated = (updated: typeof store) => {
		setStore(updated);
		onStoreUpdated?.(updated);
	};

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
						onRsvpSettingsUpdated={handleRsvpSettingsUpdated}
					/>
				</TabsContent>

				<TabsContent value="credit">
					<RsvpCreditTab
						store={store}
						rsvpSettings={rsvpSettings}
						onStoreUpdated={handleStoreUpdated}
						onRsvpSettingsUpdated={handleRsvpSettingsUpdated}
					/>
				</TabsContent>

				<TabsContent value="tag">
					<RsvpTagTab
						store={store}
						rsvpSettings={rsvpSettings}
						onStoreUpdated={onStoreUpdated}
						onRsvpSettingsUpdated={handleRsvpSettingsUpdated}
					/>
				</TabsContent>

				<TabsContent value="blacklist">
					<RsvpBlacklistTab
						store={store}
						rsvpSettings={rsvpSettings}
						onStoreUpdated={onStoreUpdated}
						onRsvpSettingsUpdated={handleRsvpSettingsUpdated}
					/>
				</TabsContent>
			</Tabs>
		</>
	);
};
