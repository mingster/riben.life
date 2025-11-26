// display given credit ledger in a table

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { CustomerCreditLedger } from "@/types";
import { format } from "date-fns";
import { useMemo } from "react";

export const DisplayCreditLedger = ({
	ledger,
}: {
	ledger: CustomerCreditLedger[];
}) => {
	if (!ledger || ledger.length === 0) return null;

	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const datetimeFormat = useMemo(() => t("datetime_format"), [t]);

	console.log(`ledger: ${JSON.stringify(ledger)}`);
	return (
		<div className="space-y-2">
			{ledger.map((item) => (
				<table key={item.id} className="w-full">
					<thead>
						<tr>
							<th className="text-left">{t("created_at")}</th>
							<th className="text-left">{t("customer_credit_amount")}</th>
							<th className="text-left">{t("balance")}</th>
							<th className="text-left">{t("customer_credit_type")}</th>
							<th className="text-left">{t("note")}</th>
							<th className="text-left">{t("customer_credit_creator")}</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>{format(item.createdAt, datetimeFormat)}</td>
							<td>{item.amount}</td>
							<td>{item.balance}</td>
							<td>{t(`customer_credit_type_${item.type}`)}</td>
							<td>{item.note}</td>
							<td>{item.Creator?.name}</td>
						</tr>
					</tbody>
				</table>
			))}
		</div>
	);
};
