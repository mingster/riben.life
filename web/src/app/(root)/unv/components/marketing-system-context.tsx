"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";

import {
	type MarketingSystemId,
	parseMarketingSystemId,
} from "./marketing-system-types";

interface MarketingSystemContextValue {
	activeSystem: MarketingSystemId;
	setActiveSystem: (id: MarketingSystemId) => void;
}

const MarketingSystemContext = createContext<
	MarketingSystemContextValue | undefined
>(undefined);

interface MarketingSystemProviderProps {
	children: ReactNode;
	initialSystem: MarketingSystemId;
}

export function MarketingSystemProvider({
	children,
	initialSystem,
}: MarketingSystemProviderProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const systemFromUrl = searchParams.get("system");
	const [activeSystem, setActiveSystemState] =
		useState<MarketingSystemId>(initialSystem);

	// Browser back/forward: keep state in sync with ?system=
	useEffect(() => {
		const fromUrl = parseMarketingSystemId(systemFromUrl ?? undefined);
		setActiveSystemState((prev) => (fromUrl !== prev ? fromUrl : prev));
	}, [systemFromUrl]);

	const setActiveSystem = useCallback(
		(id: MarketingSystemId) => {
			setActiveSystemState(id);
			const params = new URLSearchParams(searchParams.toString());
			params.set("system", id);
			const qs = params.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname, {
				scroll: false,
			});
		},
		[pathname, router, searchParams],
	);

	const value = useMemo(
		() => ({ activeSystem, setActiveSystem }),
		[activeSystem, setActiveSystem],
	);

	return (
		<MarketingSystemContext.Provider value={value}>
			{children}
		</MarketingSystemContext.Provider>
	);
}

export function useMarketingSystem(): MarketingSystemContextValue {
	const ctx = useContext(MarketingSystemContext);
	if (!ctx) {
		throw new Error(
			"useMarketingSystem must be used within MarketingSystemProvider",
		);
	}
	return ctx;
}
