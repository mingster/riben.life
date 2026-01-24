"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandGroup,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/utils/utils";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";

interface CountryCodeOption {
	countryCode: string; // ISO 3166-1 alpha-2 (e.g., "TW", "US")
	dialCode: string; // e.g., "+886", "+1"
	name: string; // Country name
}

interface PhoneCountryCodeSelectorProps {
	value: string; // Selected country code (e.g., "+886")
	onValueChange: (value: string) => void;
	disabled?: boolean;
	allowedCodes?: string[]; // Optional: filter to only show these codes (e.g., ["+1", "+886"])
}

export function PhoneCountryCodeSelector({
	value,
	onValueChange,
	disabled = false,
	allowedCodes,
}: PhoneCountryCodeSelectorProps) {
	const [open, setOpen] = useState(false);

	// Hardcoded list of allowed countries: +1 (US) and +886 (Taiwan)
	const allowedCountryOptions: CountryCodeOption[] = [
		{ countryCode: "US", dialCode: "+1", name: "United States" },
		{ countryCode: "TW", dialCode: "+886", name: "Taiwan" },
	];

	// If allowedCodes is provided, filter to only show those codes
	// Otherwise, show all allowed countries
	const countryOptions = useMemo(() => {
		if (allowedCodes && allowedCodes.length > 0) {
			return allowedCountryOptions.filter((opt) =>
				allowedCodes.includes(opt.dialCode),
			);
		}
		return allowedCountryOptions;
	}, [allowedCodes]);

	const selectedCountry = countryOptions.find((opt) => opt.dialCode === value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					disabled={disabled}
					className="h-11 w-[100px] justify-between font-mono sm:h-10 sm:min-h-0 sm:w-[120px] touch-manipulation"
				>
					{selectedCountry ? selectedCountry.dialCode : "+1"}
					<IconChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[200px] max-w-[calc(100vw-2rem)] p-0 sm:max-w-none"
				align="start"
			>
				<Command>
					<CommandList>
						<CommandGroup>
							{countryOptions.map((option) => (
								<CommandItem
									key={option.countryCode}
									value={`${option.name} ${option.dialCode} ${option.countryCode}`}
									onSelect={() => {
										onValueChange(option.dialCode);
										setOpen(false);
									}}
									className="h-11 sm:h-9"
								>
									<IconCheck
										className={cn(
											"mr-2 h-4 w-4",
											value === option.dialCode ? "opacity-100" : "opacity-0",
										)}
									/>
									<span className="font-mono mr-2">{option.dialCode}</span>
									<span>{option.name}</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
