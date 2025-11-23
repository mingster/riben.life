"use client";

import { IconPlus } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/providers/i18n-provider";

import type { CreditBonusRuleColumn } from "../credit-bonus-rule-column";
import { createTableColumns } from "./columns";
import { EditCreditBonusRuleDialog } from "./edit-credit-bonus-rule-dialog";

interface CreditBonusRuleClientProps {
	serverData: CreditBonusRuleColumn[];
}

export const CreditBonusRuleClient: React.FC<CreditBonusRuleClientProps> = ({
	serverData,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const sortRules = useCallback((rules: CreditBonusRuleColumn[]) => {
		return [...rules].sort((a, b) => {
			// Sort by threshold (ascending)
			return a.threshold - b.threshold;
		});
	}, []);

	const [data, setData] = useState<CreditBonusRuleColumn[]>(() =>
		sortRules(serverData),
	);

	const handleCreated = useCallback(
		(newRule: CreditBonusRuleColumn) => {
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
		(updated: CreditBonusRuleColumn) => {
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
					title={t("Credit_Bonus_Rules")}
					badge={data.length}
					description=""
				/>
				<div className="flex gap-2">
					<EditCreditBonusRuleDialog
						isNew
						onCreated={handleCreated}
						trigger={
							<Button variant="outline">
								<IconPlus className="mr-0 size-4" />
								{t("Create")}
							</Button>
						}
					/>
				</div>
			</div>
			<Separator />
			<DataTable<CreditBonusRuleColumn, unknown>
				columns={columns}
				data={data}
				searchKey="threshold"
			/>
		</>
	);
};
