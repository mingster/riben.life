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
		<div className="relative w-full sm:flex-1 sm:max-w-sm">
			<IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-4 sm:w-4 text-muted-foreground" />
			<Input
				placeholder={t("users_search")}
				value={searchTerm}
				onChange={handleSearchChange}
				className="pl-9 sm:pl-8 pr-10 sm:pr-8 h-10 sm:h-9 text-base sm:text-sm"
				aria-label="Search users by name, email, or Stripe customer ID"
			/>
			{searchTerm && (
				<button
					onClick={handleClearSearch}
					className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-6 sm:w-6 flex items-center justify-center text-muted-foreground hover:text-foreground active:text-foreground transition-colors"
					aria-label="Clear search"
					title="Clear search"
				>
					<IconX className="h-4 w-4 sm:h-4 sm:w-4" />
				</button>
			)}
		</div>
	);
};
