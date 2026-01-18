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
import { useState, useEffect, useMemo } from "react";
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
	storeCurrency?: string; // Store currency code for formatting cost (e.g., "twd", "usd")
};

export const ServiceStaffCombobox = ({
	serviceStaff,
	disabled,
	defaultValue,
	onValueChange,
	allowEmpty = true, // Default to allowing empty selection
	storeCurrency = "TWD", // Default to TWD if not provided
	...props
}: ComboboxProps) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<ServiceStaffColumn | null>(
		defaultValue || null,
	);

	// Sync selected state when defaultValue changes
	useEffect(() => {
		setSelected(defaultValue || null);
	}, [defaultValue]);

	// Memoize currency formatter to avoid recreating on every render
	const currencyFormatter = useMemo(
		() =>
			new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: storeCurrency.toUpperCase(),
				maximumFractionDigits: 0,
				minimumFractionDigits: 0,
			}),
		[storeCurrency],
	);

	// Memoize sorted and formatted staff list
	const sortedStaff = useMemo(() => {
		return [...serviceStaff]
			.sort((a, b) => {
				const nameA = (a.userName || a.userEmail || a.id || "").toLowerCase();
				const nameB = (b.userName || b.userEmail || b.id || "").toLowerCase();
				return nameA.localeCompare(nameB);
			})
			.map((staff) => {
				const staffName = staff.userName || staff.userEmail || staff.id;
				const costValue = staff.defaultCost;
				const displayText =
					costValue > 0
						? `${staffName} (${currencyFormatter.format(costValue)})`
						: staffName;

				// Create searchable value that includes name, email, and id
				const searchableText = [staff.userName, staff.userEmail, staff.id]
					.filter(Boolean)
					.join(" ");

				return {
					...staff,
					displayText,
					searchableText,
				};
			});
	}, [serviceStaff, currencyFormatter]);

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
							{sortedStaff.map((staff) => (
								<CommandItem
									key={staff.id}
									value={staff.searchableText}
									onSelect={() => {
										setSelected(staff);
										onValueChange?.(staff);
										setOpen(false);
									}}
								>
									<div className="flex flex-col">
										<span className="font-medium">{staff.displayText}</span>
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
};
