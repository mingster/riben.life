"use client";

import { IconPlus } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";

import type { FacilityPricingRuleColumn } from "../facility-pricing-rule-column";
import { createTableColumns } from "./columns";
import { EditFacilityPricingRuleDialog } from "./edit-facility-pricing-rule-dialog";

interface FacilityPricingRuleClientProps {
	serverData: FacilityPricingRuleColumn[];
}

export const FacilityPricingRuleClient: React.FC<
	FacilityPricingRuleClientProps
> = ({ serverData }) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const sortRules = useCallback((rules: FacilityPricingRuleColumn[]) => {
		return [...rules].sort((a, b) => {
			// Sort by priority (descending), then by name (ascending)
			if (b.priority !== a.priority) {
				return b.priority - a.priority;
			}
			return a.name.localeCompare(b.name, undefined, {
				numeric: true,
				sensitivity: "base",
			});
		});
	}, []);

	const [data, setData] = useState<FacilityPricingRuleColumn[]>(() =>
		sortRules(serverData),
	);

	const handleCreated = useCallback(
		(newRule: FacilityPricingRuleColumn) => {
			if (!newRule) return;
			setData((prev) => {
				const exists = prev.some((item) => item.id === newRule.id);
				if (exists) return prev;
				return sortRules([...prev, newRule]);
			});
		},
		[sortRules],
	);

	const handleDeleted = useCallback((ruleId: string) => {
		setData((prev) => prev.filter((item) => item.id !== ruleId));
	}, []);

	const handleUpdated = useCallback(
		(updated: FacilityPricingRuleColumn) => {
			if (!updated) return;
			setData((prev) => {
				const next = prev.map((item) =>
					item.id === updated.id ? updated : item,
				);
				return sortRules(next);
			});
		},
		[sortRules],
	);

	const columns = useMemo(
		() =>
			createTableColumns(t, {
				onDeleted: handleDeleted,
				onUpdated: handleUpdated,
			}),
		[t, handleDeleted, handleUpdated],
	);

	return (
		<>
			<div className="flex items-center justify-between">
				<Heading
					title={t("facility_pricing_rules")}
					badge={data.length}
					description={t("facility_pricing_rules_descr")}
				/>
				<div className="flex gap-2">
					<EditFacilityPricingRuleDialog
						isNew
						onCreated={handleCreated}
						trigger={
							<Button variant="outline">
								<IconPlus className="mr-0 size-4" />
								{t("create")}
							</Button>
						}
					/>
				</div>
			</div>
			<DataTable<FacilityPricingRuleColumn, unknown>
				columns={columns}
				data={data}
				searchKey="name"
			/>
		</>
	);
};
