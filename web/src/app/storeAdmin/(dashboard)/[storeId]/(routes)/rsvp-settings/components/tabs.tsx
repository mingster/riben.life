"use client";

import { Store } from "@/types";
import { RsvpSettingTab } from "./tab-rsvp-settings";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
	useParams,
	usePathname,
	useRouter,
	useSearchParams,
} from "next/navigation";
import { useEffect, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Loader } from "@/components/loader";
import { Heading } from "@/components/ui/heading";
import { RsvpTagTab } from "./tab-tag";
import { RsvpBlacklistTab } from "./tab-black-list";

export type RsvpSettingsData = {
	id: string;
	storeId: string;
	acceptReservation: boolean;
	singleServiceMode: boolean;
	minPrepaidPercentage: number;
	noNeedToConfirm: boolean;
	canCancel: boolean;
	cancelHours: number;
	canReserveBefore: number;
	canReserveAfter: number;
	defaultDuration: number;
	requireSignature: boolean;
	showCostToCustomer: boolean;
	mustSelectFacility: boolean;
	mustHaveServiceStaff: boolean;
	useBusinessHours: boolean;
	rsvpHours: string | null;
	reminderHours: number;
	syncWithGoogle: boolean;
	syncWithApple: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export interface RsvpSettingsProps {
	store: Store;
	rsvpSettings?: RsvpSettingsData | null;
	rsvpBlacklist?: Array<{
		id: string;
		storeId: string;
		userId: string;
		userName: string | null;
		userEmail: string | null;
		createdAt: bigint;
		updatedAt: bigint;
		User?: {
			id: string;
			name: string | null;
			email: string | null;
		} | null;
	}>;
	onStoreUpdated?: (store: Store) => void;
}

export const RsvpSettingTabs: React.FC<RsvpSettingsProps> = ({
	store: initialStore,
	rsvpSettings: initialRsvpSettings,
	rsvpBlacklist: initialRsvpBlacklist = [],
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

	const searchParams = useSearchParams();
	const pathname = usePathname();

	const STORAGE_KEY = "rsvp-settings-tab-selection";
	const [isMounted, setIsMounted] = useState(false);

	// Get initial tab: URL param > localStorage > default
	// Always start with "basic" to avoid hydration mismatch, then update after mount
	const [activeTab, setActiveTab] = useState<string>("basic");

	// Update active tab after mount to avoid hydration mismatch
	useEffect(() => {
		setIsMounted(true);
		const urlTab = searchParams.get("tab");
		if (urlTab) {
			setActiveTab(urlTab);
		} else if (typeof window !== "undefined") {
			const storedTab = localStorage.getItem(STORAGE_KEY);
			if (storedTab) {
				setActiveTab(storedTab);
			}
		}
	}, [searchParams]);

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

	const handleTabChange = (value: string) => {
		// Update the state
		setActiveTab(value);

		// Save to localStorage
		if (typeof window !== "undefined") {
			localStorage.setItem(STORAGE_KEY, value);
		}

		// Update the URL query parameter
		const params = new URLSearchParams(searchParams.toString());
		params.set("tab", value);
		router.push(`${pathname}?${params.toString()}`, { scroll: false });
	};

	// If the query parameter changes, update the state
	useEffect(() => {
		const urlTab = searchParams.get("tab");
		if (urlTab && urlTab !== activeTab) {
			setActiveTab(urlTab);
			// Also update localStorage to match URL
			if (typeof window !== "undefined") {
				localStorage.setItem(STORAGE_KEY, urlTab);
			}
		}
	}, [searchParams, activeTab]);
	//console.log('selectedTab: ' + activeTab);

	if (loading) {
		return <Loader />;
	}

	return (
		<>
			<div className="flex items-center justify-between">
				<Heading
					title={t("rsvp_Settings")}
					description={t("rsvp_Settings_descr")}
				/>
			</div>

			<Tabs
				value={activeTab}
				defaultValue="basic"
				onValueChange={handleTabChange}
				className="w-full"
			>
				<TabsList>
					<TabsTrigger className="px-1 lg:min-w-25" value="basic">
						{t("rsvp_Tab_System")}
					</TabsTrigger>
					<TabsTrigger className="px-1 lg:min-w-25" value="blacklist">
						{t("rsvp_Tab_Blacklist")}
					</TabsTrigger>
					<TabsTrigger className="px-1 lg:min-w-25" value="tag">
						{t("rsvp_Tab_Tag")}
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
						rsvpBlacklist={initialRsvpBlacklist}
						onStoreUpdated={onStoreUpdated}
						onRsvpSettingsUpdated={handleRsvpSettingsUpdated}
					/>
				</TabsContent>
			</Tabs>
		</>
	);
};
