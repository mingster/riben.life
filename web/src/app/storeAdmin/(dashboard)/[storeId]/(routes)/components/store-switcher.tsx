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

type PopoverTriggerProps = React.ComponentPropsWithoutRef<
	typeof PopoverTrigger
>;

//export default function StoreSwitcher({ className, items = [] }: StoreSwitcherProps) {
export default function StoreSwitcher({ className }: PopoverTriggerProps) {
	const params = useParams();
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// load user's store data
	const { data: session } = authClient.useSession();

	// Note: No need to redirect here - server-side auth (checkStoreStaffAccess)
	// already handles authentication. Client-side redirect causes issues during
	// initial hydration when session is still loading.

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
	}));

	const currentStore = formattedItems.find(
		(item) => item.value === params.storeId,
	);

	const [open, setOpen] = React.useState(false);

	const onStoreSelect = (store: { value: string; label: string }) => {
		setOpen(false);
		router.push(`/storeAdmin/${store.value}`);
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
