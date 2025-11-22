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

type ComboboxProps = {
	userData: User[];
	disabled: boolean;
	defaultValue?: number;
	onValueChange?: (newValue: User) => void;
};

// select component for customer
//
export const UserCombobox = ({
	userData,
	disabled,
	defaultValue,
	onValueChange,
	...props
}: ComboboxProps) => {
	const [mounted, setMounted] = useState(false);
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<User | null>(
		userData.find((c) => c.id === String(defaultValue)) || null,
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
						{selected ? <>{selected.name}</> : <>+ Select a existing user</>}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="p-0" side="bottom" align="start">
					<Command className="rounded-lg border shadow-md">
						<CommandInput placeholder="Select a customer..." className="h-9" />
						<CommandList>
							<CommandEmpty>No customer found</CommandEmpty>
							<CommandGroup>
								{userData.map((obj) => (
									<CommandItem
										key={obj.id}
										value={obj.email || obj.id} //value needs to be the keyword for command search
										onSelect={(value) => {
											//console.log(`onSelect: ${value}`);
											setSelected(obj);
											//return value to parent component
											onValueChange?.(obj);
											setOpen(false);
										}}
									>
										{obj.email || obj.id}
										<IconCheck
											className={cn(
												"ml-auto h-4 w-4",
												selected?.id === obj.id ? "opacity-100" : "opacity-0",
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
	}
};
