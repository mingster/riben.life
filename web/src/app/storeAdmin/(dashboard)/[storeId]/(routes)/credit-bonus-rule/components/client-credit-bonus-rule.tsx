"use client";

import { IconPlus } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import type { CreditBonusRuleColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/credit-bonus-rule/credit-bonus-rule-column";
import { DataTable } from "@/components/dataTable";
import { Heading } from "@/components/heading";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { createCreditBonusRuleColumns } from "./columns";
import { EditCreditBonusRuleDialog } from "./edit-credit-bonus-rule-dialog";

interface CreditBonusRuleClientProps {
	serverData: CreditBonusRuleColumn[];
}

export function CreditBonusRuleClient({
	serverData,
}: CreditBonusRuleClientProps) {
	const { t } = useTranslation();
	const [data, setData] = useState<CreditBonusRuleColumn[]>(serverData);

	const handleCreated = useCallback((rule: CreditBonusRuleColumn) => {
		setData((prev) =>
			[...prev, rule].sort((a, b) => a.threshold - b.threshold),
		);
	}, []);

	const handleUpdated = useCallback((rule: CreditBonusRuleColumn) => {
		setData((prev) =>
			prev
				.map((row) => (row.id === rule.id ? rule : row))
				.sort((a, b) => a.threshold - b.threshold),
		);
	}, []);

	const handleDeleted = useCallback((id: string) => {
		setData((prev) => prev.filter((row) => row.id !== id));
	}, []);

	const columns = useMemo(
		() =>
			createCreditBonusRuleColumns(t, {
				onUpdated: handleUpdated,
				onDeleted: handleDeleted,
			}),
		[t, handleDeleted, handleUpdated],
	);

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Heading
					title={t("credit_bonus_rules")}
					badge={data.length}
					description={t("credit_bonus_rule_mgmt_descr")}
				/>
				<EditCreditBonusRuleDialog
					isNew
					onCreated={handleCreated}
					trigger={
						<Button
							variant="outline"
							className="h-10 touch-manipulation sm:h-9"
						>
							<IconPlus className="mr-2 size-4" />
							<span className="text-sm sm:text-xs">{t("create")}</span>
						</Button>
					}
				/>
			</div>
			<Separator />
			<DataTable<CreditBonusRuleColumn, unknown>
				data={data}
				columns={columns}
				searchKey="id"
				noSearch
			/>
		</>
	);
}
