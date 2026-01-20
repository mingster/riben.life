"use client";

import { IconPlus } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";

import type { FacilityServiceStaffPricingRuleColumn } from "../facility-service-staff-pricing-rule-column";
import { createTableColumns } from "./columns";
import { EditFacilityServiceStaffPricingRuleDialog } from "./edit-facility-service-staff-pricing-rule-dialog";

interface FacilityServiceStaffPricingRuleClientProps {
	serverData: FacilityServiceStaffPricingRuleColumn[];
	currencyDecimals?: number;
}

export const FacilityServiceStaffPricingRuleClient: React.FC<
	FacilityServiceStaffPricingRuleClientProps
> = ({ serverData, currencyDecimals = 2 }) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const sortRules = useCallback(
		(rules: FacilityServiceStaffPricingRuleColumn[]) => {
			return [...rules].sort((a, b) => {
				// Sort by priority (descending), then by createdAt (descending)
				if (b.priority !== a.priority) {
					return b.priority - a.priority;
				}
				return b.createdAt.getTime() - a.createdAt.getTime();
			});
		},
		[],
	);

	const [data, setData] = useState<FacilityServiceStaffPricingRuleColumn[]>(
		() => sortRules(serverData),
	);

	const handleCreated = useCallback(
		(newRule: FacilityServiceStaffPricingRuleColumn) => {
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
		(updated: FacilityServiceStaffPricingRuleColumn) => {
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
				currencyDecimals,
			}),
		[t, handleDeleted, handleUpdated, currencyDecimals],
	);

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("facility_service_staff_pricing_rules")}
					badge={data.length}
					description={t("facility_service_staff_pricing_rules_descr")}
				/>
				<div className="flex flex-wrap gap-1.5 sm:gap-2 sm:content-end items-center">
					<EditFacilityServiceStaffPricingRuleDialog
						isNew
						onCreated={handleCreated}
						trigger={
							<Button variant="outline" className="h-10 sm:h-9">
								<IconPlus className="mr-2 size-4" />
								<span className="text-sm sm:text-xs">{t("create")}</span>
							</Button>
						}
					/>
				</div>
			</div>
			<DataTable<FacilityServiceStaffPricingRuleColumn, unknown>
				columns={columns}
				data={data}
				searchKey="facilityName"
			/>
		</>
	);
};
