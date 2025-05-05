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
import * as React from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { type GeneralNVType, PayoutSchedule } from "@/types/enum";
type ComboboxProps = {
	disabled: boolean;
	defaultValue: number;
	onChange?: (newStatus: number) => void;
};

export const PayoutScheduleCombobox = ({
	disabled,
	defaultValue,
	onChange,
	...props
}: ComboboxProps) => {
	const [open, setOpen] = React.useState(false);

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const [selectedStatus, setSelectedStatus] =
		React.useState<GeneralNVType | null>(
			//default to 'defaultValue'
			PayoutSchedule.find((o) => o.value === defaultValue) || null,
		);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className="w-[150px]"
					disabled={disabled}
					{...props}
				>
					{selectedStatus ? (
						<> {t(`PayoutSchedule_${selectedStatus.label}`)}</>
					) : (
						<>+ {t("select")}</>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="p-0" side="right" align="start">
				<Command>
					<CommandInput placeholder="..." />
					<CommandList>
						<CommandEmpty>{t("no_results_found")}</CommandEmpty>
						<CommandGroup>
							{PayoutSchedule.map((obj) => (
								<CommandItem
									key={obj.value}
									value={String(obj.value)}
									onSelect={(value) => {
										setSelectedStatus(
											PayoutSchedule.find((o) => o.value === Number(value)) ||
												null,
										);

										//return value to parent component
										onChange?.(Number(value));

										setOpen(false);
									}}
								>
									{t(`PayoutSchedule_${obj.label}`)}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};
