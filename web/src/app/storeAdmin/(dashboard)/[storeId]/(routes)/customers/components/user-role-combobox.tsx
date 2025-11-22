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

import { getEnumKeys } from "@/utils/utils";
import { Role } from "@/types/enum";

import { useState } from "react";

type ComboboxProps = {
	defaultValue: string;
	onChange?: (newRole: string) => void;
};

export const UserRoleCombobox = ({ defaultValue, onChange }: ComboboxProps) => {
	const [openRoleBox, setOpenRoleBox] = useState(false);

	const roleAsArray = getEnumKeys(Role);

	const [selectedRole, setSelectedRole] = useState<string | null>(
		roleAsArray.find((o) => o === defaultValue) || null,
	);

	return (
		<Popover open={openRoleBox} onOpenChange={setOpenRoleBox}>
			<PopoverTrigger asChild className="font-mono">
				<Button variant="outline" className="w-[150px] justify-start">
					{selectedRole ? <>{selectedRole}</> : <>+ Set role</>}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="p-0" side="right" align="start">
				<Command>
					<CommandInput placeholder="Change status..." />
					<CommandList>
						<CommandEmpty>No results found.</CommandEmpty>
						<CommandGroup>
							{getEnumKeys(Role).map((key, _index) => (
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
