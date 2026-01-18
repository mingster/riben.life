"use client";

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
import type { User } from "@/types";
import { cn } from "@/utils/utils";
import { IconCheck } from "@tabler/icons-react";
import { useState } from "react";
import { NotMountSkeleton } from "@/components/not-mount-skeleton";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

type ComboboxProps = {
	storeMembers: User[];
	disabled: boolean;
	defaultValue?: string | number;
	onValueChange?: (newValue: User) => void;
};

// select component for customer
//
export const StoreMembersCombobox = ({
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
	const [selected, setSelected] = useState<User | null>(
		storeMembers.find((c) => c.id === String(defaultValue)) || null,
	);

	if (!mounted) {
		setMounted(true);
	}

	if (!mounted) return <NotMountSkeleton />;

	if (mounted) {
		//if (data && !isLoading && !error) {
		//console.log('selected', selected, 'defaultValue', defaultValue);

		return (
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
						disabled={disabled}
						{...props}
					>
						{selected ? (
							<>{selected.name}</>
						) : (
							<>+ {t("select_store_member")}</>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="p-0" side="bottom" align="start">
					<Command className="rounded-lg border shadow-md">
						<CommandInput
							placeholder={t("select_store_member")}
							className="h-9"
						/>
						<CommandList>
							<CommandEmpty>{t("no_store_member_found")}</CommandEmpty>
							<CommandGroup>
								{[...storeMembers]
									.sort((a, b) => {
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
									})
									.map((obj) => {
										// Create searchable value that includes name, phone, email, and id
										// This allows searching by any of these fields while keeping id for identification
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
												value={searchableText} //value needs to be the keyword for command search
												onSelect={() => {
													setSelected(obj);
													//return value to parent component
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
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		);
	}
};
