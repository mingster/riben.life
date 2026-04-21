"use client";

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
import { useMemo, useState } from "react";

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
					className="w-[120px] justify-between font-mono"
				>
					{selectedCountry ? selectedCountry.dialCode : "+1"}
					<IconChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[200px] p-0" align="start">
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
