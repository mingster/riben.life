import { parseBagCustomizationPayload } from "@/actions/product/customize-product.validation";
import { useCallback, useState } from "react";
import type { BagCustomization } from "@/types/customizer";
import { DEFAULT_CUSTOMIZATION } from "@/types/customizer";

export function useBagCustomization(initialCustomization?: BagCustomization) {
	const [customization, setCustomization] = useState<BagCustomization>(
		initialCustomization || DEFAULT_CUSTOMIZATION,
	);

	const updateCustomization = useCallback(
		(updates: Partial<BagCustomization>) => {
			setCustomization((prev) => ({ ...prev, ...updates }));
		},
		[],
	);

	const resetCustomization = useCallback(() => {
		setCustomization(DEFAULT_CUSTOMIZATION);
	}, []);

	const loadFromJson = useCallback((json: string) => {
		try {
			const parsed: unknown = JSON.parse(json);
			const r = parseBagCustomizationPayload(parsed);
			if (!r.success) return false;
			setCustomization(r.data);
			return true;
		} catch {
			return false;
		}
	}, []);

	const toJson = useCallback(() => {
		return JSON.stringify(customization);
	}, [customization]);

	return {
		customization,
		setCustomization,
		updateCustomization,
		resetCustomization,
		loadFromJson,
		toJson,
	};
}
