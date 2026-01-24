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
import { useState, useEffect, useMemo, useCallback, memo } from "react";
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

export const ServiceStaffCombobox = memo(function ServiceStaffCombobox({
	serviceStaff,
	disabled,
	defaultValue,
	onValueChange,
	allowEmpty = true, // Default to allowing empty selection
	storeCurrency = "TWD", // Default to TWD if not provided
	...props
}: ComboboxProps) {
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

	// Memoize translation strings to avoid repeated lookups
	const selectServiceStaffText = useMemo(
		() => t("select_service_staff") || "Select service staff",
		[t],
	);
	const noneText = useMemo(() => t("none") || "None", [t]);
	const noServiceStaffFoundText = useMemo(
		() => t("no_service_staff_found") || "No service staff found",
		[t],
	);

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

	// Memoize formatted staff list (sorting is now done server-side)
	const formattedStaff = useMemo(() => {
		return serviceStaff.map((staff) => {
			const staffName = staff.userName || staff.userEmail || staff.id;
			const costValue = staff.defaultCost;
			const displayText =
				costValue > 0
					? `${staffName} (${currencyFormatter.format(costValue)})`
					: staffName;

			// Create searchable value that includes name, email, and id
			// Pre-compute to avoid repeated filtering/joining
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

	// Memoize display name calculation
	const displayName = useMemo(() => {
		return selected
			? selected.userName || selected.userEmail || selected.id
			: `+ ${selectServiceStaffText}`;
	}, [selected, selectServiceStaffText]);

	// Memoize handlers to prevent unnecessary re-renders
	const handleEmptySelect = useCallback(() => {
		setSelected(null);
		onValueChange?.(null);
		setOpen(false);
	}, [onValueChange]);

	// Create a map for O(1) lookup by searchableText
	const staffBySearchableText = useMemo(() => {
		const map = new Map<
			string,
			ServiceStaffColumn & { displayText: string; searchableText: string }
		>();
		formattedStaff.forEach((staff) => {
			map.set(staff.searchableText, staff);
		});
		return map;
	}, [formattedStaff]);

	const handleStaffSelect = useCallback(
		(searchableText: string) => {
			const staff = staffBySearchableText.get(searchableText);
			if (staff) {
				setSelected(staff);
				onValueChange?.(staff);
				setOpen(false);
			}
		},
		[staffBySearchableText, onValueChange],
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className="flex h-11 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 sm:h-9 sm:min-h-0 touch-manipulation"
					disabled={disabled}
					{...props}
				>
					{displayName}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="max-w-[calc(100vw-2rem)] p-0 sm:max-w-none"
				side="bottom"
				align="start"
			>
				<Command className="rounded-lg border shadow-md">
					<CommandInput
						placeholder={selectServiceStaffText}
						className="h-11 sm:h-9 touch-manipulation"
					/>
					<CommandList>
						<CommandEmpty>{noServiceStaffFoundText}</CommandEmpty>
						<CommandGroup>
							{/* Empty selection option */}
							{allowEmpty && (
								<CommandItem
									value="__empty__"
									onSelect={handleEmptySelect}
									className="h-11 sm:h-9"
								>
									<div className="flex flex-col">
										<span className="font-medium">{noneText}</span>
									</div>
									<IconCheck
										className={cn(
											"ml-auto h-4 w-4",
											!selected ? "opacity-100" : "opacity-0",
										)}
									/>
								</CommandItem>
							)}
							{formattedStaff.map((staff) => (
								<CommandItem
									key={staff.id}
									value={staff.searchableText}
									onSelect={handleStaffSelect}
									className="h-11 sm:h-9"
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
});
