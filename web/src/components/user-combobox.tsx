"use client";

import { IconCheck } from "@tabler/icons-react";
import { useEffect, useState } from "react";
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

interface User {
	id: string;
	name: string | null;
	email: string | null;
}

interface UserComboboxProps {
	users: User[];
	value?: string | null;
	onValueChange?: (userId: string) => void;
	disabled?: boolean;
	className?: string;
}

export const UserCombobox: React.FC<UserComboboxProps> = ({
	users,
	value,
	onValueChange,
	disabled,
	className,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<User | null>(
		value ? users.find((u) => u.id === value) || null : null,
	);

	// Sync selected state when value changes
	useEffect(() => {
		if (value) {
			const user = users.find((u) => u.id === value);
			setSelected(user || null);
		} else {
			setSelected(null);
		}
	}, [value, users]);

	const displayText = selected
		? selected.name || selected.email || selected.id
		: t("select_user") || "Select user";

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn(
						"flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
						className,
					)}
					disabled={disabled}
				>
					{displayText}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="p-0" side="bottom" align="start">
				<Command className="rounded-lg border shadow-md">
					<CommandInput
						placeholder={t("search_user") || "Search user..."}
						className="h-9"
					/>
					<CommandList>
						<CommandEmpty>{t("no_user_found") || "No user found"}</CommandEmpty>
						<CommandGroup>
							{users.map((user) => (
								<CommandItem
									key={user.id}
									value={`${user.name || ""} ${user.email || ""} ${user.id}`}
									onSelect={() => {
										setSelected(user);
										onValueChange?.(user.id);
										setOpen(false);
									}}
								>
									<div className="flex flex-col">
										<span className="font-medium">
											{user.name || user.email || user.id}
										</span>
										{user.email && user.name && (
											<span className="text-xs text-muted-foreground">
												{user.email}
											</span>
										)}
									</div>
									<IconCheck
										className={cn(
											"ml-auto h-4 w-4",
											selected?.id === user.id ? "opacity-100" : "opacity-0",
										)}
									/>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};
