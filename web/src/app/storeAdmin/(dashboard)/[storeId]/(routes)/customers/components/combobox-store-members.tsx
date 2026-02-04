"use client";

import { searchUsersAction } from "@/actions/storeAdmin/serviceStaff/search-users";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Loader } from "@/components/loader";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { User } from "@/types";
import { cn } from "@/utils/utils";
import { IconCheck } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NotMountSkeleton } from "@/components/not-mount-skeleton";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

type ComboboxProps = {
	storeId: string;
	storeMembers: User[];
	disabled: boolean;
	defaultValue?: string | number;
	onValueChange?: (newValue: User) => void;
};

// select component for customer; if no store member matches, async search entire user base
//
export const StoreMembersCombobox = ({
	storeId,
	storeMembers,
	disabled,
	defaultValue,
	onValueChange,
	...props
}: ComboboxProps) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [mounted, setMounted] = useState(false);
	const [open, setOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [extraUsers, setExtraUsers] = useState<User[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const [selected, setSelected] = useState<User | null>(
		storeMembers.find((c) => c.id === String(defaultValue)) || null,
	);

	// Merged list: store members + users from async search (exclude duplicates)
	const memberIds = new Set(storeMembers.map((m) => m.id));
	const allUsers = [
		...storeMembers,
		...extraUsers.filter((u) => !memberIds.has(u.id)),
	].sort((a, b) => {
		const nameA = (
			a.name ||
			a.phoneNumber ||
			a.email ||
			a.id ||
			""
		).toLowerCase();
		const nameB = (
			b.name ||
			b.phoneNumber ||
			b.email ||
			b.id ||
			""
		).toLowerCase();
		return nameA.localeCompare(nameB);
	});

	const runSearch = useCallback(
		async (query: string) => {
			if (!query || query.length < MIN_QUERY_LENGTH) {
				setExtraUsers([]);
				return;
			}
			setIsSearching(true);
			try {
				const result = await searchUsersAction(storeId, { query });
				setExtraUsers(result?.data?.users ?? []);
			} catch {
				setExtraUsers([]);
			} finally {
				setIsSearching(false);
			}
		},
		[storeId],
	);

	const handleSearchChange = useCallback(
		(query: string) => {
			setSearchQuery(query);
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
			}
			if (query.length < MIN_QUERY_LENGTH) {
				setExtraUsers([]);
				return;
			}
			searchTimeoutRef.current = setTimeout(() => {
				runSearch(query);
			}, SEARCH_DEBOUNCE_MS);
		},
		[runSearch],
	);

	useEffect(() => {
		return () => {
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
			}
		};
	}, []);

	const handleOpenChange = useCallback((newOpen: boolean) => {
		setOpen(newOpen);
		if (!newOpen) {
			setSearchQuery("");
			setExtraUsers([]);
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
			}
		}
	}, []);

	if (!mounted) {
		setMounted(true);
	}

	if (!mounted) return <NotMountSkeleton />;

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
					disabled={disabled}
					{...props}
				>
					{selected ? (
						<>{selected.name || selected.email || selected.phoneNumber}</>
					) : (
						<>+ {t("select_store_member")}</>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="p-0" side="bottom" align="start">
				<Command className="rounded-lg border shadow-md">
					<CommandInput
						placeholder={t("search_by_name_phone_email")}
						className="h-9"
						value={searchQuery}
						onValueChange={handleSearchChange}
					/>
					<CommandList>
						{isSearching ? (
							<div className="flex items-center justify-center py-4">
								<Loader />
							</div>
						) : (
							<>
								<CommandEmpty>{t("no_store_member_found")}</CommandEmpty>
								<CommandGroup>
									{allUsers.map((obj) => {
										const searchableText = [
											obj.name,
											obj.phoneNumber,
											obj.email,
											obj.id,
										]
											.filter(Boolean)
											.join(" ");
										const displayText =
											obj.name || obj.phoneNumber || obj.email;

										return (
											<CommandItem
												key={obj.id}
												value={searchableText}
												onSelect={() => {
													setSelected(obj);
													onValueChange?.(obj);
													setOpen(false);
												}}
											>
												{displayText}
												<IconCheck
													className={cn(
														"ml-auto h-4 w-4",
														selected?.id === obj.id
															? "opacity-100"
															: "opacity-0",
													)}
												/>
											</CommandItem>
										);
									})}
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};
