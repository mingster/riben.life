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
import type { ServiceStaffColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column";

// a combo box to select a service staff
type ComboboxProps = {
	serviceStaff: ServiceStaffColumn[];
	disabled: boolean;
	defaultValue: ServiceStaffColumn | null;
	onValueChange?: (newValue: ServiceStaffColumn | null) => void; // Allow null for empty selection
	allowEmpty?: boolean; // Allow empty selection
};

export const ServiceStaffCombobox = ({
	serviceStaff,
	disabled,
	defaultValue,
	onValueChange,
	allowEmpty = true, // Default to allowing empty selection
	...props
}: ComboboxProps) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [mounted, setMounted] = useState(false);
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<ServiceStaffColumn | null>(
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
		const displayName = selected
			? selected.userName || selected.userEmail || selected.id
			: `+ ${t("select_service_staff") || "Select service staff"}`;

		return (
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
						disabled={disabled}
						{...props}
					>
						{displayName}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="p-0" side="bottom" align="start">
					<Command className="rounded-lg border shadow-md">
						<CommandInput
							placeholder={t("select_service_staff") || "Select service staff"}
							className="h-9"
						/>
						<CommandList>
							<CommandEmpty>
								{t("no_service_staff_found") || "No service staff found"}
							</CommandEmpty>
							<CommandGroup>
								{/* Empty selection option */}
								{allowEmpty && (
									<CommandItem
										value="__empty__"
										onSelect={() => {
											setSelected(null);
											onValueChange?.(null);
											setOpen(false);
										}}
									>
										<div className="flex flex-col">
											<span className="font-medium">{t("none") || "None"}</span>
										</div>
										<IconCheck
											className={cn(
												"ml-auto h-4 w-4",
												!selected ? "opacity-100" : "opacity-0",
											)}
										/>
									</CommandItem>
								)}
								{serviceStaff.map((staff) => (
									<CommandItem
										key={staff.id}
										value={`${staff.userName || ""} ${staff.userEmail || ""} ${staff.id}`}
										onSelect={() => {
											setSelected(staff);
											onValueChange?.(staff);
											setOpen(false);
										}}
									>
										<div className="flex flex-col">
											<span className="font-medium">
												{staff.userName || staff.userEmail || staff.id}
											</span>
											{staff.userEmail && staff.userName && (
												<span className="text-xs text-muted-foreground">
													{staff.userEmail}
												</span>
											)}
										</div>
										<IconCheck
											className={cn(
												"ml-auto h-4 w-4",
												selected?.id === staff.id ? "opacity-100" : "opacity-0",
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
