"use client";

import { useTranslation } from "@/app/i18n/client";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/providers/i18n-provider";
import { IconSearch, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";

interface UserFilterProps {
	onFilterChange: (filters: {
		name: string;
		email: string;
		stripeCustomerId: string;
	}) => void;
}

export const UserFilter: React.FC<UserFilterProps> = ({ onFilterChange }) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [searchTerm, setSearchTerm] = useState("");

	// Debounced search to avoid excessive filtering on every keystroke
	const debouncedSearch = useCallback(
		(value: string) => {
			const trimmedValue = value.trim();
			// Use a single search term that searches across all fields
			onFilterChange({
				name: trimmedValue,
				email: trimmedValue,
				stripeCustomerId: trimmedValue,
			});
		},
		[onFilterChange],
	);

	// Debounce effect
	useEffect(() => {
		const timer = setTimeout(() => {
			debouncedSearch(searchTerm);
		}, 300); // 300ms delay

		return () => clearTimeout(timer);
	}, [searchTerm, debouncedSearch]);

	const handleSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value;
			setSearchTerm(value);
		},
		[],
	);

	const handleClearSearch = useCallback(() => {
		setSearchTerm("");
		onFilterChange({ name: "", email: "", stripeCustomerId: "" });
	}, [onFilterChange]);

	return (
		<div className="relative flex-1 max-w-sm">
			<IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
			<Input
				placeholder={t("users_search")}
				value={searchTerm}
				onChange={handleSearchChange}
				className="pl-8 pr-8"
				aria-label="Search users by name, email, or Stripe customer ID"
			/>
			{searchTerm && (
				<button
					onClick={handleClearSearch}
					className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
					aria-label="Clear search"
					title="Clear search"
				>
					<IconX className="h-4 w-4" />
				</button>
			)}
		</div>
	);
};
