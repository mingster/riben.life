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
	onStoreUpdated?: (store: Store) => void;
}

export const RsvpSettingTabs: React.FC<RsvpSettingsProps> = ({
	store,
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
					title={t("StoreSettings")}
					description={t("StoreSettingsDescr")}
				/>
				<Button
					disabled={loading}
					variant="destructive"
					size="sm"
					onClick={() => setOpen(true)}
				>
					<IconTrash className="size-4" />
				</Button>
			</div>

			<Tabs defaultValue="rsvp" className="w-full">
				<TabsList>
					<TabsTrigger className="px-1 lg:min-w-25" value="rsvp">
						{t("StoreSettingsTab_RSVP")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="rsvp">
					<RsvpSettingTab store={store} onStoreUpdated={onStoreUpdated} />
				</TabsContent>
			</Tabs>
		</>
	);
};
