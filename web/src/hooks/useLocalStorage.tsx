"use client";

import * as React from "react";
import { clientLogger } from "@/lib/client-logger";

export default function useLocalStorage(
	key: string,
	initialValue: string,
): [string, (value: string) => void] {
	const [storedValue, setStoredValue] = React.useState(() => {
		try {
			const item =
				typeof window !== "undefined" && window.localStorage.getItem(key);

			return item ? item : initialValue;
		} catch (_error) {
			return initialValue;
		}
	});

	type ValueSetter = (storedValue: string) => string;

	const setValue = (value: ValueSetter | string) => {
		try {
			const valueToStore =
				value instanceof Function ? value(storedValue) : value;

			setStoredValue(valueToStore);

			window.localStorage.setItem(key, valueToStore);
		} catch (error) {
			clientLogger.error(error as Error, {
				message: "Failed to set localStorage value",
				metadata: { key },
				tags: ["setValue"],
				service: "useLocalStorage",
				environment: process.env.NODE_ENV,
				version: process.env.npm_package_version,
			});
		}
	};

	return [storedValue, setValue];
}
