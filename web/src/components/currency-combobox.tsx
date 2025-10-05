"use client";

//import { Currency } from '@/prisma-pstv/pstv-database-client-types';
import { useTranslation } from "@/app/i18n/client";
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
import { useI18n } from "@/providers/i18n-provider";
import * as React from "react";
import useSWR from "swr";

export type Currency = {
	id: string;
	name: string;
	symbolNative: string;
};

type ComboboxProps = {
	disabled: boolean;
	defaultValue: string;
	onValueChange?: (newValue: string) => void;
};

export const CurrencyCombobox = ({
	disabled,
	defaultValue,
	onValueChange,
	...props
}: ComboboxProps) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const url = `${process.env.NEXT_PUBLIC_API_URL}/common/get-currencies`;

	const fetcher = (url: RequestInfo) => fetch(url).then((res) => res.json());
	const { data, error, isLoading } = useSWR(url, fetcher);
	let currencies: Currency[] = [];
	if (!isLoading && !error) {
		currencies = data as Currency[];
	}

	const [open, setOpen] = React.useState(false);

	// combox is buggy if default value is empty....
	if (defaultValue === "" || defaultValue === null) defaultValue = "TWD";
	//console.log('default: ' + defaultValue);

	const [selected, setSelected] = React.useState<string | null>(defaultValue);

	//console.log('defaultValue: ' + defaultValue);
	//console.log('selected: ' + JSON.stringify(selected));
	if (error) return <div>failed to load</div>;
	if (isLoading) return <div>loading...</div>;
	if (data && !isLoading && !error) {
		//console.log('data: ' + JSON.stringify(data));
		return (
			<>
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
							disabled={disabled}
							{...props}
						>
							{selected ? <>{selected}</> : <>+ Currency</>}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="p-0" side="bottom" align="start">
						<Command>
							<CommandInput
								placeholder={t("currency_combobox_changePlaceHolder")}
							/>
							<CommandList>
								<CommandEmpty>{t("currency_combobox_notFound")}</CommandEmpty>
								<CommandGroup>
									{currencies.map((currency) => (
										<CommandItem
											key={currency.id}
											value={currency.id.toLocaleUpperCase()}
											onSelect={(newValue) => {
												//console.log('onSelect: ' + value);
												setSelected(newValue.toLocaleUpperCase());
												//setSelected(currencies.find((o) => o.id === value)?.id || null);

												//return value to parent component
												onValueChange?.(newValue);
												setOpen(false);
											}}
										>
											{currency.name} ({currency.id}) {currency.symbolNative}
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			</>
		);
	}
};
