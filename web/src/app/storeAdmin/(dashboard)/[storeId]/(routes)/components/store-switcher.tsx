"use client";

import type { Store } from "@prisma/client";
import { Check, ChevronsUpDown, PlusCircle, StoreIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import useSWR from "swr";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/utils/utils";

import { useStoreModal } from "@/hooks/storeAdmin/use-store-modal";
import { authClient } from "@/lib/auth-client";
import { useCookies } from "next-client-cookies";
import { toastError, toastSuccess } from "@/components/toaster";
import clientLogger from "@/lib/client-logger";

type PopoverTriggerProps = React.ComponentPropsWithoutRef<
	typeof PopoverTrigger
>;

//
export default function StoreSwitcher({ className }: PopoverTriggerProps) {
	const params = useParams();
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// load user's store data
	const { data: session } = authClient.useSession();

	// Only construct URL if session exists
	const url = session?.user.id
		? `${process.env.NEXT_PUBLIC_API_URL}/store/owner/${session.user.id}/getStores`
		: null;
	const fetcher = (url: RequestInfo) => fetch(url).then((res) => res.json());

	// SWR won't fetch if url is null
	// Optimize: prevent unnecessary re-fetching once data is loaded
	const { data, error, isLoading } = useSWR(url, fetcher, {
		revalidateIfStale: false, // Don't revalidate even if data is marked stale
		revalidateOnFocus: false, // Don't revalidate when window regains focus
		revalidateOnReconnect: false, // Don't revalidate when network reconnects
		dedupingInterval: 3600000, // Dedupe requests within 1 hour
	});

	let items: Store[] = [];
	if (!isLoading && !error && data) items = data;

	const formattedItems = items.map((item) => ({
		label: item.name,
		value: item.id,
		organizationId: item.organizationId,
	}));

	const currentStore = formattedItems.find(
		(item) => item.value === params.storeId,
	);

	const [open, setOpen] = React.useState(false);
	const [isSwitching, setIsSwitching] = React.useState(false);
	const cookies = useCookies();
	const LAST_SELECTED_STORE_KEY = "lastSelectedStoreId";

	// 1. change active organization to the selected store's organization
	// 2. remember selection. use the info when user visit next time.
	// 3. redirect to the selected store's dashboard
	const onStoreSelect = async (store: {
		value: string;
		label: string;
		organizationId?: string | null;
	}) => {
		if (isSwitching) return; // Prevent multiple simultaneous switches

		setOpen(false);
		setIsSwitching(true);

		try {
			// 1. Change active organization to the selected store's organization
			if (store.organizationId) {
				try {
					// Fetch organization details to get slug
					const orgResponse = await fetch(
						`/api/common/get-organization?id=${store.organizationId}`,
					);

					if (orgResponse.ok) {
						const organization = await orgResponse.json();

						if (organization?.id && organization?.slug) {
							// Set active organization using authClient
							const result = await authClient.organization.setActive({
								organizationId: organization.id,
								organizationSlug: organization.slug,
							});

							if (result?.error) {
								clientLogger.warn("Failed to set active organization", {
									metadata: {
										error: result.error,
										organizationId: organization.id,
										storeId: store.value,
									},
									tags: ["store", "organization", "warning"],
								});
								// Continue anyway - organization switch is not critical
							}
						}
					}
				} catch (error) {
					clientLogger.error("Error setting active organization", {
						metadata: {
							error: error instanceof Error ? error.message : String(error),
							storeId: store.value,
						},
						tags: ["store", "organization", "error"],
					});
					// Continue anyway - organization switch is not critical
				}
			}

			// 2. Remember selection - store in cookie for next visit
			cookies.set(LAST_SELECTED_STORE_KEY, store.value, {
				path: "/",
			});

			// 3. Redirect to the selected store's dashboard
			router.push(`/storeAdmin/${store.value}`);

			// Refresh the page to ensure all data is loaded with the new organization context
			router.refresh();
		} catch (error) {
			clientLogger.error("Error switching store", {
				metadata: {
					error: error instanceof Error ? error.message : String(error),
					storeId: store.value,
				},
				tags: ["store", "switcher", "error"],
			});

			toastError({
				title: t("Error") || "Error",
				description:
					error instanceof Error
						? error.message
						: "Failed to switch store. Please try again.",
			});
		} finally {
			setIsSwitching(false);
		}
	};

	// open store modal
	const storeModal = useStoreModal();

	return (
		<>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						//role="combobox"
						aria-expanded={open}
						//aria-label={t("storeAdmin_switcher_select_a_store")}
						className={cn("lg:w-full justify-between", className)}
					>
						<StoreIcon className="mr-0 size-4" />
						{currentStore?.label}
						<ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[200px] p-0">
					<Command>
						<CommandList>
							<CommandInput
								placeholder={t("storeAdmin_switcher_search_prompt")}
							/>
							<CommandEmpty>No store found.</CommandEmpty>
							<CommandGroup heading={t("storeAdmin_switcher_heading")}>
								{formattedItems.map((store) => (
									<CommandItem
										key={store.value}
										onSelect={() => onStoreSelect(store)}
										className="text-sm"
									>
										<StoreIcon className="mr-0 size-4" />
										{store.label}
										<Check
											className={cn(
												"ml-auto h-4 w-4",
												currentStore?.value === store.value
													? "opacity-100"
													: "opacity-0",
											)}
										/>
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
						<CommandSeparator />
						<CommandList>
							<CommandGroup>
								<CommandItem
									onSelect={() => {
										setOpen(false);
										storeModal.onOpen();
									}}
								>
									<PlusCircle className="mr-2 size-5" />
									{t("storeAdmin_switcher_create_store")}
								</CommandItem>
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</>
	);
}
