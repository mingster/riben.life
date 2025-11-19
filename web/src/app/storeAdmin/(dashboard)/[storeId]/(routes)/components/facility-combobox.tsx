"use client";

//import { Currency } from '@prisma/client';
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
import type { StoreFacility } from "@prisma/client";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { CheckIcon } from "lucide-react";
import * as React from "react";
import useSWR from "swr";

type ComboboxProps = {
	storeId: string;
	disabled: boolean;
	defaultValue: string;
	onValueChange?: (newValue: string) => void;
};

export const FacilityCombobox = ({
	storeId,
	disabled,
	defaultValue,
	onValueChange,
	...props
}: ComboboxProps) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${storeId}/facilities`;
	const fetcher = (url: RequestInfo) => fetch(url).then((res) => res.json());
	const { data, error, isLoading } = useSWR(url, fetcher);
	let tables: StoreFacility[] = [];
	if (!isLoading && !error) {
		tables = data as StoreFacility[];
	}

	/*
  tables.push({
    id: "",
    facilityName: "---",
    storeId: storeId, capacity: 0
  });
  */

	const [open, setOpen] = React.useState(false);
	const [selected, setSelected] = React.useState<string | "">(defaultValue);
	const [_displayName, setDisplayName] = React.useState<string | "">();

	//console.log('defaultValue', defaultValue);
	//console.log('selected', selected);
	//console.log('data', JSON.stringify(data));

	if (error) return <div>failed to load</div>;
	if (isLoading) return <div>loading...</div>;

	if (data && !isLoading && !error) {
		return (
			<>
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							disabled={disabled}
							variant="outline"
							aria-expanded={open}
							className="w-[200px] justify-between"
						>
							{selected
								? tables.find((table) => table.id === selected)?.facilityName
								: "Select a table"}
							<CaretSortIcon className="ml-2 size-4 shrink-0 opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="p-0" side="bottom" align="start">
						<Command>
							<CommandInput placeholder="" />
							<CommandList>
								<CommandEmpty> --- </CommandEmpty>
								<CommandGroup>
									{tables.map((table) => (
										<CommandItem
											key={table.id}
											value={table.id}
											onSelect={(newValue) => {
												//console.log('onSelect: ' + value);
												setSelected(newValue);
												setDisplayName(table.facilityName);
												onValueChange?.(newValue); //return value to parent component
												setOpen(false);
											}}
										>
											{table.facilityName}
											<CheckIcon
												className={cn(
													"ml-auto h-4 w-4",
													selected === table.id ? "opacity-100" : "opacity-0",
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
