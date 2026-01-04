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
import { cn } from "@/utils/utils";
import { IconCheck } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { NotMountSkeleton } from "@/components/not-mount-skeleton";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { StoreFacility } from "@/types";

// a combo box to select a store facility
type ComboboxProps = {
	storeFacilities: StoreFacility[];
	disabled: boolean;
	defaultValue: StoreFacility | null;
	onValueChange?: (newValue: StoreFacility | null) => void;
	allowNone?: boolean; // Allow clearing selection (for optional facilities)
};

export const FacilityCombobox = ({
	storeFacilities,
	disabled,
	defaultValue,
	onValueChange,
	allowNone = false,
	...props
}: ComboboxProps) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [mounted, setMounted] = useState(false);
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<StoreFacility | null>(
		defaultValue || null,
	);

	// Sync selected state when defaultValue changes
	useEffect(() => {
		setSelected(defaultValue || null);
	}, [defaultValue]);

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
							<>{selected.facilityName}</>
						) : (
							<>+ {t("select_store_facility")}</>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="p-0" side="bottom" align="start">
					<Command className="rounded-lg border shadow-md">
						<CommandInput
							placeholder={t("select_store_facility")}
							className="h-9"
						/>
						<CommandList>
							<CommandEmpty>{t("no_store_facility_found")}</CommandEmpty>
							<CommandGroup>
								{allowNone && (
									<CommandItem
										value="--none--"
										onSelect={() => {
											setSelected(null);
											onValueChange?.(null);
											setOpen(false);
										}}
									>
										{t("none") || "None"}
										<IconCheck
											className={cn(
												"ml-auto h-4 w-4",
												!selected ? "opacity-100" : "opacity-0",
											)}
										/>
									</CommandItem>
								)}
								{storeFacilities.map((obj) => (
									<CommandItem
										key={obj.id}
										value={obj.facilityName || obj.id} //value needs to be the keyword for command search
										onSelect={(value) => {
											//console.log(`onSelect: ${value}`);
											setSelected(obj as StoreFacility);
											//return value to parent component
											onValueChange?.(obj as StoreFacility);
											setOpen(false);
										}}
									>
										{obj.facilityName || obj.id}
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
