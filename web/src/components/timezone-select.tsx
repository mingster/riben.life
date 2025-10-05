"use client";

import { useEffect, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

// List of common timezones
const timezones = [
	"UTC",
	"America/New_York",
	"America/Los_Angeles",
	"America/Chicago",
	"Europe/London",
	"Europe/Paris",
	"Europe/Berlin",
	"Asia/Tokyo",
	"Asia/Shanghai",
	"Asia/Singapore",
	"Asia/Taipei",
	"Australia/Sydney",
	"Pacific/Auckland",
];

interface TimezoneSelectProps {
	value?: string;
	onValueChange?: (value: string) => void;
	className?: string;
	disabled?: boolean;
}

export function TimezoneSelect({
	value,
	onValueChange,
	className,
	disabled,
}: TimezoneSelectProps) {
	const [selectedTimezone, setSelectedTimezone] = useState(
		value || Intl.DateTimeFormat().resolvedOptions().timeZone,
	);

	useEffect(() => {
		if (value) {
			setSelectedTimezone(value);
		}
	}, [value]);

	return (
		<Select
			value={selectedTimezone}
			onValueChange={(newValue) => {
				setSelectedTimezone(newValue);
				onValueChange?.(newValue);
			}}
			disabled={disabled}
		>
			<SelectTrigger className={className}>
				<SelectValue placeholder="Select timezone" />
			</SelectTrigger>
			<SelectContent>
				{timezones.map((tz) => (
					<SelectItem key={tz} value={tz}>
						{tz}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
