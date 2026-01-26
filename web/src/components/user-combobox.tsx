"use client";

import { IconCheck } from "@tabler/icons-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/loader";

interface User {
	id: string;
	name: string | null;
	email: string | null;
	phoneNumber?: string | null;
}

interface UserComboboxProps {
	users: User[];
	value?: string | null;
	onValueChange?: (userId: string) => void;
	disabled?: boolean;
	className?: string;
	onSearch?: (query: string) => Promise<User[]>;
	searchDebounceMs?: number;
}

export const UserCombobox: React.FC<UserComboboxProps> = ({
	users: initialUsers,
	value,
	onValueChange,
	disabled,
	className,
	onSearch,
	searchDebounceMs = 300,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [open, setOpen] = useState(false);
	const [users, setUsers] = useState<User[]>(initialUsers);
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const [selected, setSelected] = useState<User | null>(
		value ? users.find((u) => u.id === value) || null : null,
	);

	// Sync users when initialUsers changes
	useEffect(() => {
		setUsers(initialUsers);
	}, [initialUsers]);

	// Sync selected state when value changes
	useEffect(() => {
		if (value) {
			const user = users.find((u) => u.id === value);
			setSelected(user || null);
		} else {
			setSelected(null);
		}
	}, [value, users]);

	// Handle async search
	const handleSearch = useCallback(
		async (query: string) => {
			if (!onSearch || query.length < 2) {
				// If query is too short, use initial users
				setUsers(initialUsers);
				return;
			}

			setIsSearching(true);
			try {
				const searchResults = await onSearch(query);
				// Merge search results with initial users, removing duplicates
				const mergedUsers = [
					...initialUsers,
					...searchResults.filter(
						(searchUser) => !initialUsers.some((u) => u.id === searchUser.id),
					),
				];
				setUsers(mergedUsers);
			} catch (error) {
				// On error, fall back to initial users
				setUsers(initialUsers);
			} finally {
				setIsSearching(false);
			}
		},
		[onSearch, initialUsers],
	);

	// Debounced search handler
	const handleSearchChange = useCallback(
		(query: string) => {
			setSearchQuery(query);
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
			}
			searchTimeoutRef.current = setTimeout(() => {
				handleSearch(query);
			}, searchDebounceMs);
		},
		[handleSearch, searchDebounceMs],
	);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
			}
		};
	}, []);

	const displayText = selected
		? selected.name || selected.email || selected.id
		: t("select_user") || "Select user";

	// Reset search when popover closes
	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen);
		if (!newOpen) {
			// Reset search when closing
			setSearchQuery("");
			setUsers(initialUsers);
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
			}
		}
	};

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn(
						"flex h-10 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation sm:h-9 sm:min-h-0 sm:text-sm [&>span]:line-clamp-1",
						className,
					)}
					disabled={disabled}
				>
					{displayText}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="p-0 max-w-[calc(100vw-1rem)] sm:max-w-none"
				side="bottom"
				align="start"
			>
				<Command className="rounded-lg border shadow-md" shouldFilter={true}>
					<CommandInput
						placeholder={t("search_user") || "Search user..."}
						className="h-10 text-base touch-manipulation sm:h-9 sm:text-sm"
						onValueChange={(value) => {
							// Update search query for async search
							handleSearchChange(value);
							// Command's built-in filtering will handle real-time filtering
						}}
					/>
					<CommandList>
						{isSearching ? (
							<div className="flex items-center justify-center p-4">
								<Loader />
							</div>
						) : (
							<>
								<CommandEmpty className="px-3 py-2 text-sm sm:text-xs">
									{t("no_user_found") || "No user found"}
								</CommandEmpty>
								<CommandGroup>
									{users.map((user) => (
										<CommandItem
											key={user.id}
											value={`${user.name || ""} ${user.email || ""} ${user.phoneNumber || ""} ${user.id}`}
											onSelect={() => {
												setSelected(user);
												onValueChange?.(user.id);
												setOpen(false);
											}}
											className="h-11 px-3 py-2 touch-manipulation sm:h-10 sm:min-h-0 sm:px-2 sm:py-1.5"
										>
											<div className="flex flex-col flex-1 min-w-0">
												<span className="font-medium text-sm sm:text-xs truncate">
													{user.name || user.email || user.id}
												</span>
												{user.email && user.name && (
													<span className="text-xs text-muted-foreground truncate sm:text-[10px]">
														{user.email}
													</span>
												)}
											</div>
											<IconCheck
												className={cn(
													"ml-auto h-5 w-5 flex-shrink-0 sm:h-4 sm:w-4",
													selected?.id === user.id
														? "opacity-100"
														: "opacity-0",
												)}
											/>
										</CommandItem>
									))}
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};
