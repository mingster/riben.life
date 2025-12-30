"use client";

import { useState, useEffect, useMemo } from "react";
import {
	parsePhoneNumber,
	getCountryCallingCode,
	getCountries,
} from "libphonenumber-js";
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
import { IconCheck, IconChevronDown } from "@tabler/icons-react";

interface CountryCodeOption {
	countryCode: string; // ISO 3166-1 alpha-2 (e.g., "TW", "US")
	dialCode: string; // e.g., "+886", "+1"
	name: string; // Country name
}

// Get list of countries with dial codes
function getCountryCodeOptions(): CountryCodeOption[] {
	const countries = getCountries();
	return countries
		.map((countryCode) => {
			try {
				const dialCode = getCountryCallingCode(countryCode as any);
				// Get country name (simplified - you might want to use a proper i18n solution)
				const countryNames: Record<string, string> = {
					TW: "Taiwan",
					US: "United States",
					CN: "China",
					JP: "Japan",
					KR: "South Korea",
					SG: "Singapore",
					HK: "Hong Kong",
					MY: "Malaysia",
					TH: "Thailand",
					VN: "Vietnam",
					PH: "Philippines",
					ID: "Indonesia",
					GB: "United Kingdom",
					AU: "Australia",
					CA: "Canada",
					FR: "France",
					DE: "Germany",
					IT: "Italy",
					ES: "Spain",
					NL: "Netherlands",
					BE: "Belgium",
					CH: "Switzerland",
					AT: "Austria",
					SE: "Sweden",
					NO: "Norway",
					DK: "Denmark",
					FI: "Finland",
					PL: "Poland",
					BR: "Brazil",
					MX: "Mexico",
					AR: "Argentina",
					CL: "Chile",
					CO: "Colombia",
					PE: "Peru",
					IN: "India",
					PK: "Pakistan",
					BD: "Bangladesh",
					LK: "Sri Lanka",
					NP: "Nepal",
					MM: "Myanmar",
					KH: "Cambodia",
					LA: "Laos",
					BN: "Brunei",
					NZ: "New Zealand",
					FJ: "Fiji",
					PG: "Papua New Guinea",
				};

				return {
					countryCode,
					dialCode: `+${dialCode}`,
					name: countryNames[countryCode] || countryCode,
				};
			} catch {
				return null;
			}
		})
		.filter((item): item is CountryCodeOption => item !== null)
		.sort((a, b) => {
			// Sort by dial code (numeric)
			const aCode = parseInt(a.dialCode.replace("+", ""), 10);
			const bCode = parseInt(b.dialCode.replace("+", ""), 10);
			return aCode - bCode;
		});
}

interface PhoneCountryCodeSelectorProps {
	value: string; // Selected country code (e.g., "+886")
	onValueChange: (value: string) => void;
	disabled?: boolean;
}

export function PhoneCountryCodeSelector({
	value,
	onValueChange,
	disabled = false,
}: PhoneCountryCodeSelectorProps) {
	const [open, setOpen] = useState(false);
	const countryOptions = useMemo(() => getCountryCodeOptions(), []);

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
			<PopoverContent className="w-[300px] p-0" align="start">
				<Command>
					<CommandInput
						placeholder="Search country or code..."
						className="h-9"
					/>
					<CommandList>
						<CommandEmpty>No country found.</CommandEmpty>
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
