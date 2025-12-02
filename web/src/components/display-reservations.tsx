// display given reservations in a table

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { format } from "date-fns";
import { useMemo } from "react";
import Link from "next/link";
import { getDateInTz, getOffsetHours } from "@/utils/datetime-utils";

export const DisplayReservations = ({
	reservations,
}: {
	reservations: Rsvp[];
}) => {
	if (!reservations || reservations.length === 0) return null;

	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const datetimeFormat = useMemo(() => t("datetime_format"), [t]);

	return (
		<div className="space-y-3 sm:space-y-4">
			{/* Mobile: Card view */}
			<div className="block sm:hidden space-y-3">
				{reservations.map((item) => (
					<div
						key={item.id}
						className="rounded-lg border bg-card p-3 space-y-2 text-xs"
					>
						<div className="flex items-start justify-between gap-2">
							<div className="flex-1 min-w-0">
								<div className="font-medium text-sm truncate">
									{item.Store?.id ? (
										<Link
											href={`/${item.Store.id}/reservation`}
											className="hover:underline text-primary"
										>
											{item.Store.name}
										</Link>
									) : (
										item.Store?.name
									)}
								</div>
								<div className="text-muted-foreground text-[10px]">
									{format(
										getDateInTz(
											item.rsvpTime,
											getOffsetHours(
												item.Store?.defaultTimezone ?? "Asia/Taipei",
											),
										),
										`${datetimeFormat} HH:mm`,
									)}
								</div>
							</div>
							<div className="shrink-0">
								<span
									className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium ${
										item.status === 0
											? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400"
											: item.status === 10
												? "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
												: item.status === 20 || item.status === 30
													? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
													: item.status === 40 || item.status === 50
														? "bg-gray-50 text-gray-700 dark:bg-gray-950/20 dark:text-gray-400"
														: item.status === 60
															? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
															: "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400"
									}`}
								>
									{t(`rsvp_status_${item.status}`)}
								</span>
							</div>
						</div>

						{item.Facility?.facilityName && (
							<div className="text-[10px] text-muted-foreground">
								<span className="font-medium">{t("rsvp_facility")}:</span>
								{item.Facility.facilityName}
							</div>
						)}

						{item.note && (
							<div className="text-[10px]">
								<span className="font-medium text-muted-foreground">
									{t("rsvp_message")}:
								</span>
								<span className="text-foreground">{item.note}</span>
							</div>
						)}

						{item.User?.name && (
							<div className="text-[10px] text-muted-foreground">
								<span className="font-medium">{t("rsvp_creator")}:</span>
								{item.User?.name}
							</div>
						)}

						<div className="text-[10px] text-muted-foreground pt-1 border-t">
							{format(
								getDateInTz(
									item.createdAt,
									getOffsetHours(item.Store?.defaultTimezone ?? "Asia/Taipei"),
								),
								datetimeFormat,
							)}
						</div>
					</div>
				))}
			</div>

			{/* Desktop: Table view */}
			<div className="hidden sm:block rounded-md border overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full border-collapse min-w-full">
						<thead>
							<tr className="bg-muted/50">
								<th className="text-left px-3 py-2 text-xs font-medium">
									{t("created_at")}
								</th>
								<th className="text-left px-3 py-2 text-xs font-medium">
									{t("rsvp_time")}
								</th>
								<th className="text-left px-3 py-2 text-xs font-medium">
									{t("rsvp_status")}
								</th>
								<th className="text-left px-3 py-2 text-xs font-medium">
									{t("rsvp_message")}
								</th>
								<th className="text-left px-3 py-2 text-xs font-medium">
									{t("rsvp_creator")}
								</th>
								<th className="text-left px-3 py-2 text-xs font-medium">
									{t("store_name")}
								</th>
								<th className="text-left px-3 py-2 text-xs font-medium">
									{t("rsvp_facility")}
								</th>
							</tr>
						</thead>
						<tbody>
							{reservations.map((item) => (
								<tr key={item.id} className="border-b last:border-b-0">
									<td className="px-3 py-2 text-xs font-mono">
										{format(
											getDateInTz(
												item.createdAt,
												getOffsetHours(
													item.Store?.defaultTimezone ?? "Asia/Taipei",
												),
											),
											datetimeFormat,
										)}
									</td>
									<td className="px-3 py-2 text-xs font-mono">
										{format(
											getDateInTz(
												item.rsvpTime,
												getOffsetHours(
													item.Store?.defaultTimezone ?? "Asia/Taipei",
												),
											),
											`${datetimeFormat} HH:mm`,
										)}
									</td>
									<td className="px-3 py-2 text-xs">
										<span
											className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium ${
												item.status === 0
													? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400"
													: item.status === 10
														? "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400"
														: item.status === 20 || item.status === 30
															? "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"
															: item.status === 40 || item.status === 50
																? "bg-gray-50 text-gray-700 dark:bg-gray-950/20 dark:text-gray-400"
																: item.status === 60
																	? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
																	: "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400"
											}`}
										>
											{t(`rsvp_status_${item.status}`)}
										</span>
									</td>
									<td className="px-3 py-2 text-xs max-w-[200px] truncate">
										{item.note || "-"}
									</td>
									<td className="px-3 py-2 text-xs">
										{item.User?.name || "-"}
									</td>
									<td className="px-3 py-2 text-xs">
										{item.Store?.id ? (
											<Link
												href={`/${item.Store.id}/reservation`}
												className="hover:underline text-primary"
											>
												{item.Store.name}
											</Link>
										) : (
											item.Store?.name
										)}
									</td>
									<td className="px-3 py-2 text-xs">
										{item.Facility?.facilityName || "-"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};
