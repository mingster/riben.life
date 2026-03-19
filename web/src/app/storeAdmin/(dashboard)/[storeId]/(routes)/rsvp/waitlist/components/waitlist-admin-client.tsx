"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { toastSuccess, toastError } from "@/components/toaster";
import { listWaitlistAction } from "@/actions/storeAdmin/waitlist/list-waitlist";
import { callWaitlistNumberAction } from "@/actions/storeAdmin/waitlist/call-waitlist-number";
import { seatWaitlistEntryAction } from "@/actions/storeAdmin/waitlist/seat-waitlist-entry";
import { cancelWaitlistEntryAction } from "@/actions/storeAdmin/waitlist/cancel-waitlist-entry";
import {
	IconLoader2,
	IconPhone,
	IconUserCheck,
	IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { epochToDate, formatDurationMsShort } from "@/utils/datetime-utils";
import { format } from "date-fns";
import { getDateInTz } from "@/utils/datetime-utils";
import { getOffsetHours } from "@/utils/datetime-utils";

type WaitlistEntry = {
	id: string;
	queueNumber: number;
	sessionBlock: string;
	verificationCode: string;
	numOfAdult: number;
	numOfChild: number;
	name: string | null;
	lastName: string | null;
	phone: string | null;
	status: string;
	orderId: string | null;
	createdAt: number;
	waitTimeMs?: number | null;
	Facility?: { id: string; facilityName: string } | null;
};

interface WaitlistAdminClientProps {
	storeId: string;
	waitlistEnabled: boolean;
	facilities: { id: string; facilityName: string }[];
	storeTimezone: string;
}

export function WaitlistAdminClient({
	storeId,
	waitlistEnabled,
	facilities,
	storeTimezone,
}: WaitlistAdminClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const params = useParams<{ storeId: string }>();
	const [entries, setEntries] = useState<WaitlistEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [statusFilter, setStatusFilter] = useState<"active" | "all">("active");
	const [sessionScope, setSessionScope] = useState<
		"current_session" | "today" | "all"
	>("current_session");
	const [seatDialog, setSeatDialog] = useState<{
		entry: WaitlistEntry;
		facilityId: string;
	} | null>(null);
	const [actioning, setActioning] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (!params?.storeId) return;
		setLoading(true);
		try {
			const result = await listWaitlistAction(params.storeId, {
				statusFilter,
				sessionScope,
			});
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			if (result?.data?.entries) {
				setEntries(result.data.entries as unknown as WaitlistEntry[]);
			}
		} finally {
			setLoading(false);
		}
	}, [params?.storeId, statusFilter, sessionScope]);

	useEffect(() => {
		load();
	}, [load]);

	const handleCall = useCallback(
		async (entry: WaitlistEntry) => {
			setActioning(entry.id);
			try {
				const result = await callWaitlistNumberAction(storeId, {
					waitlistId: entry.id,
				});
				if (result?.serverError) {
					toastError({ description: result.serverError });
					return;
				}
				toastSuccess({
					description: t("waitlist_mgmt_call") + " #" + entry.queueNumber,
				});
				load();
			} finally {
				setActioning(null);
			}
		},
		[storeId, load, t],
	);

	const handleSeat = useCallback(
		async (entry: WaitlistEntry, facilityId: string) => {
			setActioning(entry.id);
			try {
				const result = await seatWaitlistEntryAction(storeId, {
					waitlistId: entry.id,
					facilityId,
				});
				if (result?.serverError) {
					toastError({ description: result.serverError });
					return;
				}
				toastSuccess({
					description: t("waitlist_mgmt_seat") + " #" + entry.queueNumber,
				});
				setSeatDialog(null);
				load();
			} finally {
				setActioning(null);
			}
		},
		[storeId, load, t],
	);

	const handleCancel = useCallback(
		async (entry: WaitlistEntry) => {
			setActioning(entry.id);
			try {
				const result = await cancelWaitlistEntryAction(storeId, {
					waitlistId: entry.id,
				});
				if (result?.serverError) {
					toastError({ description: result.serverError });
					return;
				}
				toastSuccess({
					description: t("waitlist_mgmt_cancel") + " #" + entry.queueNumber,
				});
				load();
			} finally {
				setActioning(null);
			}
		},
		[storeId, load, t],
	);

	const statusLabel = (status: string) => {
		switch (status) {
			case "waiting":
				return t("waitlist_status_waiting");
			case "called":
				return t("waitlist_status_called");
			case "seated":
				return t("waitlist_status_seated");
			case "cancelled":
				return t("waitlist_status_cancelled");
			default:
				return status;
		}
	};

	const formatCreatedAt = (epoch: number) => {
		const d = epochToDate(BigInt(epoch));
		if (!d) return "";
		const inTz = getDateInTz(d, getOffsetHours(storeTimezone));
		return format(inTz, "HH:mm");
	};

	const sessionLabel = (block: string) => {
		switch (block) {
			case "morning":
				return t("waitlist_session_morning");
			case "afternoon":
				return t("waitlist_session_afternoon");
			case "evening":
				return t("waitlist_session_evening");
			default:
				return block;
		}
	};

	if (!waitlistEnabled) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("waitlist_mgmt")}</CardTitle>
					<CardDescription>
						{t("waitlist_not_available")} {t("waitlist_settings_enabled")} in{" "}
						<Link
							href={`/storeAdmin/${storeId}/rsvp-settings`}
							className="text-primary underline"
						>
							RSVP Settings
						</Link>
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<>
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0">
					<div>
						<CardTitle>{t("waitlist_mgmt")}</CardTitle>
						<CardDescription>
							{t("waitlist_queue_number")} • {t("waitlist_code")} •{" "}
							{t("waitlist_mgmt_call")} / {t("waitlist_mgmt_seat")} /{" "}
							{t("waitlist_mgmt_cancel")}
						</CardDescription>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Select
							value={sessionScope}
							onValueChange={(v) =>
								setSessionScope(v as "current_session" | "today" | "all")
							}
						>
							<SelectTrigger className="w-[140px] sm:w-[160px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="current_session">
									{t("waitlist_scope_current_session")}
								</SelectItem>
								<SelectItem value="today">
									{t("waitlist_scope_today")}
								</SelectItem>
								<SelectItem value="all">{t("waitlist_scope_all")}</SelectItem>
							</SelectContent>
						</Select>
						<Select
							value={statusFilter}
							onValueChange={(v) => setStatusFilter(v as "active" | "all")}
						>
							<SelectTrigger className="w-[120px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="active">
									{t("waitlist_status_waiting")} + {t("waitlist_status_called")}
								</SelectItem>
								<SelectItem value="all">{t("all")}</SelectItem>
							</SelectContent>
						</Select>
						<Button
							variant="outline"
							size="sm"
							onClick={load}
							disabled={loading}
						>
							{loading ? (
								<IconLoader2 className="h-4 w-4 animate-spin" />
							) : (
								"Refresh"
							)}
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{loading && entries.length === 0 ? (
						<div className="flex justify-center py-8">
							<IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					) : entries.length === 0 ? (
						<p className="py-6 text-center text-muted-foreground">
							No entries in waitlist.
						</p>
					) : (
						<div className="overflow-x-auto rounded-md border">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-muted/50">
										<th className="p-2 text-left font-medium">
											{t("waitlist_queue_number")}
										</th>
										<th className="p-2 text-left font-medium">
											{t("waitlist_session_column")}
										</th>
										<th className="p-2 text-left font-medium">
											{t("waitlist_code")}
										</th>
										<th className="p-2 text-left font-medium">
											{t("waitlist_party_size")}
										</th>
										<th className="p-2 text-left font-medium">
											{t("waitlist_name")}
										</th>
										<th className="p-2 text-left font-medium">
											{t("waitlist_phone")}
										</th>
										<th className="p-2 text-left font-medium">
											{t("waitlist_status")}
										</th>
										<th className="p-2 text-left font-medium">
											{t("waitlist_wait_time_column")}
										</th>
										<th className="p-2 text-left font-medium">
											{t("waitlist_has_order")}
										</th>
										<th className="p-2 text-left font-medium">
											{t("waitlist_created_at")}
										</th>
										<th className="p-2 text-right font-medium">Actions</th>
									</tr>
								</thead>
								<tbody>
									{entries.map((entry) => (
										<tr key={entry.id} className="border-b">
											<td className="p-2 font-mono">#{entry.queueNumber}</td>
											<td className="p-2 text-xs sm:text-sm">
												{sessionLabel(entry.sessionBlock ?? "morning")}
											</td>
											<td className="p-2 font-mono">
												{entry.verificationCode}
											</td>
											<td className="p-2">
												{entry.numOfAdult}
												{entry.numOfChild > 0 ? `+${entry.numOfChild}` : ""}
											</td>
											<td className="p-2">
												{[entry.name, entry.lastName]
													.filter(Boolean)
													.join(" ") || "—"}
											</td>
											<td className="p-2">{entry.phone || "—"}</td>
											<td className="p-2">{statusLabel(entry.status)}</td>
											<td className="p-2 font-mono tabular-nums">
												{entry.waitTimeMs != null &&
												Number(entry.waitTimeMs) > 0
													? formatDurationMsShort(Number(entry.waitTimeMs))
													: "—"}
											</td>
											<td className="p-2">{entry.orderId ? "✓" : "—"}</td>
											<td className="p-2">
												{formatCreatedAt(entry.createdAt)}
											</td>
											<td className="p-2 text-right">
												{entry.status === "waiting" && (
													<Button
														variant="ghost"
														size="sm"
														className="h-8"
														onClick={() => handleCall(entry)}
														disabled={actioning === entry.id}
													>
														{actioning === entry.id ? (
															<IconLoader2 className="h-4 w-4 animate-spin" />
														) : (
															<>
																<IconPhone className="mr-1 h-4 w-4" />
																{t("waitlist_mgmt_call")}
															</>
														)}
													</Button>
												)}
												{(entry.status === "waiting" ||
													entry.status === "called") && (
													<Button
														variant="ghost"
														size="sm"
														className="h-8"
														onClick={() =>
															setSeatDialog({
																entry,
																facilityId: facilities[0]?.id ?? "",
															})
														}
														disabled={
															actioning === entry.id || facilities.length === 0
														}
													>
														{actioning === entry.id ? (
															<IconLoader2 className="h-4 w-4 animate-spin" />
														) : (
															<>
																<IconUserCheck className="mr-1 h-4 w-4" />
																{t("waitlist_mgmt_seat")}
															</>
														)}
													</Button>
												)}
												{(entry.status === "waiting" ||
													entry.status === "called") && (
													<Button
														variant="ghost"
														size="sm"
														className="h-8 text-destructive"
														onClick={() => handleCancel(entry)}
														disabled={actioning === entry.id}
													>
														{actioning === entry.id ? (
															<IconLoader2 className="h-4 w-4 animate-spin" />
														) : (
															<>
																<IconX className="mr-1 h-4 w-4" />
																{t("waitlist_mgmt_cancel")}
															</>
														)}
													</Button>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={!!seatDialog}
				onOpenChange={(open) => !open && setSeatDialog(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{t("waitlist_mgmt_seat")} #{seatDialog?.entry.queueNumber}
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-2">
						<label className="text-sm font-medium">Table / Facility</label>
						<Select
							value={seatDialog?.facilityId ?? ""}
							onValueChange={(v) =>
								seatDialog && setSeatDialog({ ...seatDialog, facilityId: v })
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select table" />
							</SelectTrigger>
							<SelectContent>
								{facilities.map((f) => (
									<SelectItem key={f.id} value={f.id}>
										{f.facilityName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setSeatDialog(null)}>
							Cancel
						</Button>
						<Button
							onClick={() => {
								if (seatDialog && seatDialog.facilityId) {
									handleSeat(seatDialog.entry, seatDialog.facilityId);
								}
							}}
							disabled={!seatDialog?.facilityId || !!actioning}
						>
							{t("waitlist_mgmt_seat")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
