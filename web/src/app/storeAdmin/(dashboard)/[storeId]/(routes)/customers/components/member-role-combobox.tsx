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

import { MemberRole } from "@/types/enum";
import { getEnumKeys } from "@/utils/utils";

import { useState } from "react";

type MemberRoleComboboxProps = {
	defaultValue: string;
	onChange?: (newRole: string) => void;
	className?: string;
};

import { cn } from "@/lib/utils";

// select component for member role
//
export const MemberRoleCombobox = ({
	defaultValue,
	onChange,
	className,
}: MemberRoleComboboxProps) => {
	const [openRoleBox, setOpenRoleBox] = useState(false);

	const roleAsArray = getEnumKeys(MemberRole);

	const [selectedRole, setSelectedRole] = useState<string | null>(
		roleAsArray.find((o) => o === defaultValue) || null,
	);

	return (
		<Popover open={openRoleBox} onOpenChange={setOpenRoleBox}>
			<PopoverTrigger asChild className="font-mono">
				<Button
					variant="outline"
					className={cn("w-[150px] justify-start", className)}
				>
					{selectedRole ? <>{selectedRole}</> : <>+ Set role</>}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="p-0" side="right" align="start">
				<Command>
					<CommandInput placeholder="Change status..." />
					<CommandList>
						<CommandEmpty>No results found.</CommandEmpty>
						<CommandGroup>
							{getEnumKeys(MemberRole).map((key, _index) => (
								<CommandItem
									key={key}
									value={key}
									onSelect={(value) => {
										setSelectedRole(value);
										//return value to parent component
										onChange?.(value);
										setOpenRoleBox(false);
									}}
								>
									{key}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};
