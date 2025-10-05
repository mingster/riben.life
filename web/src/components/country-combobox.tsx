"use client";

import type { Country } from "@/../.prisma/client";
import useSWR from "swr";

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
import { cn } from "@/utils/utils";
import { IconCheck } from "@tabler/icons-react";
import { useState } from "react";

type ComboboxProps = {
	disabled: boolean;
	defaultValue: string | undefined;
	onValueChange?: (newValue: string) => void;
};

export const CountryCombobox = ({
	disabled,
	defaultValue,
	onValueChange,
	...props
}: ComboboxProps) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const url = `${process.env.NEXT_PUBLIC_API_URL}/common/get-countries`;

	const fetcher = (url: RequestInfo) => fetch(url).then((res) => res.json());
	const { data, error, isLoading } = useSWR(url, fetcher);

	let countries: Country[] = [];
	if (!isLoading && !error) countries = data;

	const [open, setOpen] = useState(false);

	const [selected, setSelected] = useState<string | undefined>(
		defaultValue,
		//countries.find((c) => (c.alpha3 = defaultValue))?.alpha3 || null
	);

	if (error) return <div>failed to load</div>;
	if (isLoading) return <div>loading...</div>;
	if (data && !isLoading && !error) {
		//if (!selected) setSelected(defaultValue);

		//console.log('selected: ' + selected);
		/*
    if (open) {
      setSelected(defaultValue);
    }
    */
		return (
			<>
				{/*
        <div className="flex pr-10">{selected}</div> */}
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
							disabled={disabled}
							{...props}
						>
							{selected ? <>{selected}</> : <>+ Country</>}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="p-0" side="bottom" align="start">
						<Command className="rounded-lg border shadow-md">
							<CommandInput
								placeholder={t("country_combobox_PlaceHolder")}
								className="h-9"
							/>
							<CommandList>
								<CommandEmpty>
									{t("country_combobox_noCountryFound")}
								</CommandEmpty>
								<CommandGroup>
									{countries.map((obj) => (
										<CommandItem
											key={obj.alpha3}
											value={obj.alpha3}
											onSelect={(value) => {
												//console.log('onSelect: ' + value);
												setSelected(value);
												//setSelected(currencies.find((o) => o.id === value)?.id || null);

												//return value to parent component
												onValueChange?.(value);
												setOpen(false);
											}}
										>
											{obj.name} ({obj.alpha3})
											<IconCheck
												className={cn(
													"ml-auto h-4 w-4",
													selected === obj.alpha3 ? "opacity-100" : "opacity-0",
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
	}
};
