import { useTranslation } from "@/app/i18n/client";
import * as React from "react";

import { useI18n } from "@/providers/i18n-provider";
import { type TwBankCode, TwBankCodes } from "@/types/bank3";
import { cn } from "@/utils/utils";
import { useState } from "react";

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
import { CheckIcon } from "lucide-react";
type ComboboxProps = {
	disabled: boolean;
	defaultValue: string | undefined;
	onValueChange?: (newValue: string) => void;
};

export const TwBankCodeCombobox = ({
	disabled,
	defaultValue,
	onValueChange,
}: ComboboxProps) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");
	const [selected, setSelected] = useState<string | undefined>(defaultValue);
	const [open, setOpen] = useState(false);

	console.log(`selected: ${selected}`);

	return (
		<>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
						disabled={disabled}
					>
						{selected ? <>{selected}</> : <>+ {t("StoreSettings_BankCode")}</>}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="p-0" side="bottom" align="start">
					<Command className="rounded-lg border shadow-md">
						<CommandInput
							placeholder={t("StoreSettings_BankCode")}
							className="h-9"
						/>
						<CommandList>
							<CommandEmpty>{t("no_results_found")}</CommandEmpty>
							<CommandGroup>
								{TwBankCodes.map((obj: TwBankCode) => (
									<CommandItem
										key={obj.Value}
										value={obj.Value}
										onSelect={(value) => {
											//console.log('onSelect: ' + value);
											setSelected(value);
											//setSelected(currencies.find((o) => o.id === value)?.id || null);

											//return value to parent component
											onValueChange?.(value);
											setOpen(false);
										}}
									>
										{obj.Value} ({obj.Key})
										<CheckIcon
											className={cn(
												"ml-auto h-4 w-4",
												selected === obj.Key ? "opacity-100" : "opacity-0",
											)}
										/>
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</>
	);
};
