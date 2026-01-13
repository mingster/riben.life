"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconEdit, IconLoader, IconUpload } from "@tabler/icons-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Loader } from "@/components/loader";
import { toastError, toastSuccess } from "@/components/toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { RsvpStatus } from "@/types/enum";
import { getRsvpStatusColorClasses } from "@/utils/rsvp-status-utils";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/providers/i18n-provider";
import {
	epochToDate,
	getDateInTz,
	getOffsetHours,
	convertToUtc,
} from "@/utils/datetime-utils";
import {
	parseReservationDateTime,
	parseRsvpImportText,
} from "@/utils/rsvp-import-parser";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import {
	format,
	addWeeks,
	setDay,
	setHours,
	setMinutes,
	addMilliseconds,
} from "date-fns";

interface ServiceStaffInfo {
	name: string;
	defaultCost: number;
	defaultDuration: number;
}

interface ClientImportRsvpProps {
	storeTimezone: string;
	storeCurrency?: string;
	serviceStaffInfo: ServiceStaffInfo | null;
	onImported?: () => void;
}

interface ParsedRsvpPreview {
	customerName: string;
	productName: string; // Product name from import (e.g., "網球課10H")
	rsvpTime: Date | null;
	arriveTime: Date | null; // Same as rsvpTime from imported text
	duration: number;
	serviceStaffName: string;
	cost: number;
	alreadyPaid: boolean;
	status: "valid" | "error";
	rsvpStatus: RsvpStatus; // RSVP status (Ready, Completed, etc.)
	error?: string;
	blockIndex: number;
	reservationNumber: number;
}

const importRsvpSchema = z.object({
	rsvpData: z.string().min(1, "RSVP data is required"),
});

type ImportRsvpFormValues = z.infer<typeof importRsvpSchema>;

export function ClientImportRsvp({
	storeTimezone,
	storeCurrency = "twd",
	serviceStaffInfo,
	onImported,
}: ClientImportRsvpProps) {
	const params = useParams<{ storeId: string }>();
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [isParsing, setIsParsing] = useState(false);
	const [importing, setImporting] = useState(false);
	const [parsedRsvps, setParsedRsvps] = useState<ParsedRsvpPreview[]>([]);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [editFormData, setEditFormData] =
		useState<Partial<ParsedRsvpPreview> | null>(null);

	// Calculate cost per minute from service staff info
	const costPerMinute = useMemo(() => {
		if (!serviceStaffInfo) return 0;
		return serviceStaffInfo.defaultDuration > 0
			? serviceStaffInfo.defaultCost / serviceStaffInfo.defaultDuration
			: 0;
	}, [serviceStaffInfo]);

	const form = useForm<ImportRsvpFormValues>({
		resolver: zodResolver(importRsvpSchema),
		defaultValues: {
			rsvpData: "",
		},
		mode: "onChange",
	});

	const hasErrors = useMemo(
		() => parsedRsvps.some((rsvp) => rsvp.status === "error"),
		[parsedRsvps],
	);

	const handleParse = useCallback(async () => {
		const rsvpData = form.watch("rsvpData");
		if (!rsvpData.trim()) {
			toastError({ description: "Please enter RSVP data to parse" });
			return;
		}

		setIsParsing(true);
		try {
			const parsedData = parseRsvpImportText(rsvpData);

			if (parsedData.errors.length > 0) {
				toastError({
					description: `Parsing errors: ${parsedData.errors.length} error(s) found`,
				});
			}

			// Get service staff name and cost calculation info
			if (!serviceStaffInfo) {
				toastError({
					description:
						"Current user is not a service staff. Please add yourself as service staff first.",
				});
				return;
			}

			const serviceStaffName = serviceStaffInfo.name;
			const { defaultCost, defaultDuration } = serviceStaffInfo;

			// Calculate cost per minute (store in component for edit dialog)
			const costPerMinute =
				defaultDuration > 0 ? defaultCost / defaultDuration : 0;

			const preview: ParsedRsvpPreview[] = [];

			for (
				let blockIndex = 0;
				blockIndex < parsedData.blocks.length;
				blockIndex++
			) {
				const block = parsedData.blocks[blockIndex];

				// Track last valid time slot for recurring RSVPs (empty slots)
				let lastValidTimeSlot: {
					startTime: string;
					endTime: string;
					duration: number;
					dayOfWeek: number;
					rsvpTime: bigint;
					rsvpTimeDate: Date; // Store as Date for pattern calculation
				} | null = null;

				// Track previous valid RSVP time to calculate incremental pattern
				let previousValidRsvpTime: Date | null = null;

				// Track the time difference pattern between consecutive valid RSVPs
				let timeDifferenceMs: number | null = null;

				// Track recurring RSVP count for sequential numbers
				let recurringRsvpCount = 0;

				// Get current time in store timezone for calculating future dates
				const now = new Date();
				const offsetHours = getOffsetHours(storeTimezone);
				const nowInStoreTz = getDateInTz(now, offsetHours);

				for (const reservation of block.reservations) {
					try {
						const dateTimeResult = parseReservationDateTime(
							reservation.date,
							reservation.startTime,
							reservation.endTime,
							reservation.year,
							storeTimezone,
						);

						// Handle empty slots (recurring RSVPs)
						if (!dateTimeResult.rsvpTime) {
							// Check if this is an empty slot (no startTime/endTime)
							if (
								reservation.startTime === null &&
								reservation.endTime === null
							) {
								// This is a recurring RSVP
								if (!lastValidTimeSlot) {
									// No valid time slot found yet, skip this recurring RSVP
									preview.push({
										customerName: block.customerName,
										productName: block.productName,
										rsvpTime: null,
										arriveTime: null,
										duration: 0,
										serviceStaffName,
										cost: 0,
										alreadyPaid: block.paidDate !== null,
										status: "error",
										rsvpStatus: RsvpStatus.Pending,
										error: "No valid time slot found for recurring RSVP",
										blockIndex,
										reservationNumber: reservation.number,
									});
									continue;
								}

								// Increment recurring RSVP count for sequential numbers
								recurringRsvpCount++;

								// Calculate future date based on incremental pattern from imported data
								let nextDateUtc: Date;

								if (
									timeDifferenceMs !== null &&
									timeDifferenceMs > 0 &&
									lastValidTimeSlot.rsvpTimeDate
								) {
									// Use the calculated time difference pattern from the last two consecutive valid RSVPs
									// Base date is the last valid RSVP's date (e.g., #5 = Jan 2)
									// timeDifferenceMs is the actual time gap between the last two valid RSVPs
									// (e.g., #4 = Dec 31, #5 = Jan 2 → gap = 2 days = 48 hours)
									// For recurring RSVPs, add the time difference multiplied by the recurring count
									const baseDate = lastValidTimeSlot.rsvpTimeDate;
									const totalOffsetMs = timeDifferenceMs * recurringRsvpCount;
									nextDateUtc = addMilliseconds(baseDate, totalOffsetMs);

									// Ensure the date is in the future
									if (nextDateUtc <= nowInStoreTz) {
										// If calculated date is in the past, find next future occurrence
										// Keep adding the time difference until we get a future date
										while (nextDateUtc <= nowInStoreTz) {
											nextDateUtc = addMilliseconds(
												nextDateUtc,
												timeDifferenceMs,
											);
										}
									}
								} else {
									// Fallback: Use weekly pattern if no pattern detected
									// Find the first future occurrence of the same day of week
									const [lastStartHour, lastStartMinute] =
										lastValidTimeSlot.startTime.split(":").map(Number);

									let firstMatchingDate: Date | null = null;
									for (let w = 1; w <= 10; w++) {
										const candidateDate = addWeeks(nowInStoreTz, w);
										const candidateDayOfWeek = candidateDate.getDay();

										if (candidateDayOfWeek === lastValidTimeSlot.dayOfWeek) {
											firstMatchingDate = candidateDate;
											break;
										}
									}

									if (!firstMatchingDate) {
										firstMatchingDate = addWeeks(nowInStoreTz, 1);
										firstMatchingDate = setDay(
											firstMatchingDate,
											lastValidTimeSlot.dayOfWeek,
										);
									}

									const nextDate = addWeeks(
										firstMatchingDate,
										recurringRsvpCount - 1,
									);
									const nextDateWithTime = setHours(
										setMinutes(nextDate, lastStartMinute),
										lastStartHour,
									);

									nextDateUtc = convertToUtc(
										`${nextDateWithTime.getFullYear()}-${String(nextDateWithTime.getMonth() + 1).padStart(2, "0")}-${String(nextDateWithTime.getDate()).padStart(2, "0")}T${String(lastStartHour).padStart(2, "0")}:${String(lastStartMinute).padStart(2, "0")}`,
										storeTimezone,
									);
								}

								const cost =
									costPerMinute > 0
										? costPerMinute * lastValidTimeSlot.duration
										: 0;

								preview.push({
									customerName: block.customerName,
									productName: block.productName,
									rsvpTime: nextDateUtc, // Future date calculated from last valid time slot
									arriveTime: null, // Recurring RSVPs don't have arriveTime
									duration: lastValidTimeSlot.duration,
									serviceStaffName,
									cost,
									alreadyPaid: block.paidDate !== null,
									status: "valid",
									rsvpStatus: RsvpStatus.Ready, // Recurring RSVPs are Ready
									error: `Recurring (${recurringRsvpCount})`,
									blockIndex,
									reservationNumber: reservation.number,
								});
								continue;
							}

							// Invalid date/time format
							preview.push({
								customerName: block.customerName,
								productName: block.productName,
								rsvpTime: null,
								arriveTime: null,
								duration: 0,
								serviceStaffName,
								cost: 0,
								alreadyPaid: block.paidDate !== null,
								status: "error",
								rsvpStatus: RsvpStatus.Pending, // Error state, use Pending as default
								error: "Invalid date/time format",
								blockIndex,
								reservationNumber: reservation.number,
							});
							continue;
						}

						// Valid reservation - update last valid time slot and calculate pattern
						const rsvpTimeDate = epochToDate(dateTimeResult.rsvpTime);
						if (!rsvpTimeDate) {
							// Skip if date parsing failed
							continue;
						}

						// Convert arriveTime from epoch to Date (same as rsvpTime)
						const arriveTimeDate = dateTimeResult.arriveTime
							? epochToDate(dateTimeResult.arriveTime)
							: null;

						const dayOfWeek = getDateInTz(rsvpTimeDate, offsetHours).getDay();

						// Calculate time difference pattern from consecutive valid RSVPs
						// This tracks the gap between the last two consecutive valid RSVPs
						// For example, if #4 = Dec 31 and #5 = Jan 2, timeDifferenceMs = 2 days (48 hours)
						if (previousValidRsvpTime !== null) {
							// Calculate the time difference between this and the previous valid RSVP
							// This gives us the incremental pattern to use for recurring RSVPs
							timeDifferenceMs =
								rsvpTimeDate.getTime() - previousValidRsvpTime.getTime();
						}

						// Update previous valid RSVP time for next iteration
						previousValidRsvpTime = rsvpTimeDate;

						lastValidTimeSlot = {
							startTime: reservation.startTime!,
							endTime: reservation.endTime!,
							duration: dateTimeResult.duration,
							dayOfWeek,
							rsvpTime: dateTimeResult.rsvpTime,
							rsvpTimeDate, // Store Date for pattern calculation
						};

						// Reset recurring count when we encounter a valid reservation
						recurringRsvpCount = 0;

						// Calculate cost using service staff's default cost
						// Formula: (defaultCost / defaultDuration) * reservationDuration
						const cost =
							costPerMinute > 0 ? costPerMinute * dateTimeResult.duration : 0;

						// Determine RSVP status
						// If rsvpTime exists in imported data, status = Completed
						// If no rsvpTime (recurring), status = Ready
						const rsvpStatus = RsvpStatus.Completed; // Has rsvpTime, so Completed

						preview.push({
							customerName: block.customerName,
							productName: block.productName,
							rsvpTime: rsvpTimeDate,
							arriveTime: arriveTimeDate,
							duration: dateTimeResult.duration,
							serviceStaffName,
							cost,
							alreadyPaid: block.paidDate !== null,
							status: "valid",
							rsvpStatus,
							blockIndex,
							reservationNumber: reservation.number,
						});
					} catch (error) {
						preview.push({
							customerName: block.customerName,
							productName: block.productName,
							rsvpTime: null,
							arriveTime: null,
							duration: 0,
							serviceStaffName,
							cost: 0,
							alreadyPaid: block.paidDate !== null,
							status: "error",
							rsvpStatus: RsvpStatus.Pending, // Error state, use Pending as default
							error:
								error instanceof Error
									? error.message
									: "Failed to parse reservation",
							blockIndex,
							reservationNumber: reservation.number,
						});
					}
				}
			}

			setParsedRsvps(preview);

			if (preview.length === 0) {
				toastError({ description: "No valid reservations found in data" });
			} else if (hasErrors) {
				toastError({
					description: `${preview.filter((p) => p.status === "error").length} reservation(s) have errors`,
				});
			} else {
				/*
				toastSuccess({
					description: `Successfully parsed ${preview.length} reservation(s)`,
				});*/
			}
		} catch (error) {
			toastError({
				description:
					error instanceof Error ? error.message : "Failed to parse RSVP data",
			});
		} finally {
			setIsParsing(false);
		}
	}, [form, storeTimezone, serviceStaffInfo, t, hasErrors]);

	const handleImport = useCallback(async () => {
		if (parsedRsvps.length === 0 || hasErrors) {
			return;
		}

		setImporting(true);
		try {
			// Send parsed preview data with pre-calculated rsvpTime and arriveTime
			const importData = parsedRsvps.map((rsvp) => ({
				customerName: rsvp.customerName,
				productName: rsvp.productName,
				rsvpTime: rsvp.rsvpTime ? rsvp.rsvpTime.toISOString() : null,
				arriveTime: rsvp.arriveTime ? rsvp.arriveTime.toISOString() : null,
				duration: rsvp.duration,
				cost: rsvp.cost,
				alreadyPaid: rsvp.alreadyPaid,
				rsvpStatus: rsvp.rsvpStatus,
				blockIndex: rsvp.blockIndex,
				reservationNumber: rsvp.reservationNumber,
			}));

			const response = await fetch(
				`/api/storeAdmin/${params.storeId}/rsvp/import`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ rsvps: importData }),
				},
			);

			const result = await response.json();

			if (!response.ok || !result.success) {
				toastError({
					description:
						result.error ||
						`Import failed: ${result.errors?.length || 0} error(s)`,
				});
				return;
			}

			toastSuccess({
				description:
					t("rsvp_import_success", {
						count: result.createdReservations,
					}) ||
					`Successfully imported ${result.createdReservations} reservation(s)`,
			});

			// Reset form and state
			form.reset();
			setParsedRsvps([]);

			// Refresh data or navigate
			if (onImported) {
				onImported();
			} else {
				router.refresh();
			}
		} catch (error) {
			toastError({
				description:
					error instanceof Error ? error.message : "Failed to import RSVPs",
			});
		} finally {
			setImporting(false);
		}
	}, [form, parsedRsvps, hasErrors, params.storeId, router, onImported]);

	const columns: ColumnDef<ParsedRsvpPreview>[] = useMemo(
		() => [
			{
				accessorKey: "customerName",
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t("customer") || "Customer"}
					/>
				),
			},
			{
				accessorKey: "rsvpTime",
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t("rsvp_time") || "Reservation Time"}
					/>
				),
				cell: ({ row }) => {
					const date = row.getValue("rsvpTime") as Date | null;
					const error = row.original.error;
					if (!date) {
						// Check if this is a recurring RSVP
						if (error === "Recurring (10 weeks)") {
							return (
								<span className="text-muted-foreground italic">
									{t("recurring") || "Recurring (10 weeks)"}
								</span>
							);
						}
						return <span className="text-muted-foreground">N/A</span>;
					}
					return (
						<span className="font-mono">
							{format(date, "yyyy-MM-dd HH:mm")}
						</span>
					);
				},
			},
			{
				accessorKey: "duration",
				header: t("duration") || "Duration",
				cell: ({ row }) => {
					const duration = row.getValue("duration") as number;
					return `${duration} min`;
				},
				meta: {
					className: "hidden sm:table-cell",
				},
			},
			{
				accessorKey: "serviceStaffName",
				header: t("service_staff") || "Service Staff",
			},
			{
				accessorKey: "cost",
				header: t("cost") || "Cost",
				cell: ({ row }) => {
					const cost = row.getValue("cost") as number;
					return cost > 0
						? new Intl.NumberFormat("en-US", {
								style: "currency",
								currency: storeCurrency.toUpperCase(),
							}).format(cost)
						: "-";
				},
			},
			{
				accessorKey: "alreadyPaid",
				header: t("order_is_paid") || "Payment Status",
				cell: ({ row }) => {
					const paid = row.getValue("alreadyPaid") as boolean;
					return (
						<span className="flex items-center justify-center">
							<span
								className={`h-2 w-2 rounded-full ${
									paid ? "bg-green-500" : "bg-red-500"
								}`}
							/>
						</span>
					);
				},
				meta: {
					className: "hidden sm:table-cell",
				},
			},
			{
				accessorKey: "rsvpStatus",
				header: ({ column }) => (
					<DataTableColumnHeader
						column={column}
						title={t("rsvp_status") || "RSVP Status"}
					/>
				),
				cell: ({ row }) => {
					const rsvpStatus = row.getValue("rsvpStatus") as RsvpStatus;
					const statusLabel =
						t(`rsvp_status_${rsvpStatus}`) || `Status ${rsvpStatus}`;
					return (
						<span
							className={cn(
								"inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs font-mono",
								getRsvpStatusColorClasses(rsvpStatus, false),
							)}
						>
							<span className="font-medium">{statusLabel}</span>
						</span>
					);
				},
			},
			{
				id: "status",
				header: t("parse_status") || "Parse Status",
				cell: ({ row }) => {
					const status = row.original.status;
					const error = row.original.error;
					return (
						<div className="space-y-1">
							{status === "valid" ? (
								<Badge variant="default">{t("valid") || "Valid"}</Badge>
							) : (
								<Badge variant="destructive">{t("error") || "Error"}</Badge>
							)}
							{error && <div className="text-xs text-destructive">{error}</div>}
						</div>
					);
				},
			},
			{
				id: "actions",
				header: t("actions") || "Actions",
				cell: ({ row }) => {
					const index = row.index;
					return (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" className="h-8 w-8 p-0">
									<span className="sr-only">Open menu</span>
									<IconEdit className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									onClick={() => {
										setEditingIndex(index);
										setEditFormData({ ...row.original });
									}}
								>
									<IconEdit className="mr-2 h-4 w-4" />
									{t("edit") || "Edit"}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					);
				},
			},
		],
		[t, storeCurrency],
	);

	return (
		<div className="space-y-4">
			<Form {...form}>
				<form onSubmit={form.handleSubmit(handleParse)} className="space-y-4">
					<FormField
						control={form.control}
						name="rsvpData"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									{t("rsvp_import_data") || "RSVP Data"}{" "}
									<span className="text-destructive">*</span>
								</FormLabel>
								<FormControl>
									<Textarea
										placeholder={
											t("rsvp_import_data_placeholder") ||
											`許達夫 網球課10H（12/17 2025）
1-   12/19 14:00～15:00
2-   12/24 14:00～15:00`
										}
										disabled={isParsing || importing}
										className="min-h-[200px] font-mono text-sm"
										{...field}
									/>
								</FormControl>
								<FormDescription className="text-xs font-mono text-gray-500">
									{t("rsvp_import_data_description") ||
										"Paste RSVP data in the specified format. First line: customer name, product name, and paid date. Following lines: reservation date and time ranges."}
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="flex gap-2">
						<Button
							type="submit"
							variant="outline"
							disabled={!form.watch("rsvpData") || isParsing || importing}
							className="h-10 sm:h-9 sm:min-h-0"
						>
							{isParsing ? (
								<>
									<Loader />
									<span className="ml-2">{t("parsing") || "Parsing..."}</span>
								</>
							) : (
								t("preview") || "Parse & Preview"
							)}
						</Button>
					</div>
				</form>
			</Form>

			{parsedRsvps.length > 0 && (
				<div className="mt-4 space-y-4">
					<div className="text-sm font-medium">
						{t("parsed_reservations") || "Parsed Reservations"} (
						{parsedRsvps.length})
					</div>

					{hasErrors && (
						<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3">
							<div className="text-sm font-semibold text-destructive">
								{t("validation_errors") || "Validation Errors"}
							</div>
							<div className="mt-2 space-y-1">
								{parsedRsvps
									.filter((rsvp) => rsvp.status === "error")
									.map((rsvp, index) => (
										<div key={index} className="text-sm text-destructive">
											{rsvp.customerName} - {rsvp.error}
										</div>
									))}
							</div>
						</div>
					)}

					<DataTable<ParsedRsvpPreview, unknown>
						columns={columns}
						data={parsedRsvps}
						searchKey="customerName"
						noPagination={parsedRsvps.length <= 50}
					/>

					<div className="flex justify-end">
						<Button
							type="button"
							onClick={handleImport}
							disabled={parsedRsvps.length === 0 || importing || hasErrors}
							className="h-10 sm:h-9 sm:min-h-0"
						>
							{importing ? (
								<>
									<IconLoader className="mr-2 h-4 w-4 animate-spin" />
									{t("importing") || "Importing..."}
								</>
							) : (
								<>
									<IconUpload className="mr-2 h-4 w-4" />
									{t("import") || "Import RSVPs"} ({parsedRsvps.length})
								</>
							)}
						</Button>
					</div>
				</div>
			)}

			{/* Edit Dialog */}
			<Dialog
				open={editingIndex !== null}
				onOpenChange={(open) => {
					if (!open) {
						setEditingIndex(null);
						setEditFormData(null);
					}
				}}
			>
				<DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>
							{t("edit_reservation") || "Edit Reservation"}
						</DialogTitle>
						<DialogDescription>
							{t("edit_reservation_description") ||
								"Edit the reservation details before importing."}
						</DialogDescription>
					</DialogHeader>
					{editFormData && (
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<label className="text-sm font-medium">
									{t("customer") || "Customer"}{" "}
									<span className="text-destructive">*</span>
								</label>
								<Input
									value={editFormData.customerName || ""}
									onChange={(e) =>
										setEditFormData({
											...editFormData,
											customerName: e.target.value,
										})
									}
								/>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium">
									{t("rsvp_time") || "Reservation Time"}
								</label>
								<Input
									type="datetime-local"
									value={
										editFormData.rsvpTime
											? format(editFormData.rsvpTime, "yyyy-MM-dd'T'HH:mm")
											: ""
									}
									onChange={(e) => {
										const newDate = e.target.value
											? new Date(e.target.value)
											: null;
										setEditFormData({
											...editFormData,
											rsvpTime: newDate,
											rsvpStatus: newDate
												? RsvpStatus.Completed
												: RsvpStatus.Ready,
										});
									}}
								/>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium">
									{t("duration") || "Duration"} (minutes){" "}
									<span className="text-destructive">*</span>
								</label>
								<Input
									type="number"
									min="1"
									value={editFormData.duration || 0}
									onChange={(e) => {
										const duration = parseInt(e.target.value, 10) || 0;
										const newCost =
											costPerMinute > 0 ? costPerMinute * duration : 0;
										setEditFormData({
											...editFormData,
											duration,
											cost: newCost,
										});
									}}
								/>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium">
									{t("cost") || "Cost"}
								</label>
								<Input
									type="number"
									min="0"
									step="1"
									value={editFormData.cost || 0}
									onChange={(e) =>
										setEditFormData({
											...editFormData,
											cost: parseFloat(e.target.value) || 0,
										})
									}
								/>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium">
									{t("rsvp_status") || "RSVP Status"}
								</label>
								<Select
									value={String(editFormData.rsvpStatus || RsvpStatus.Ready)}
									onValueChange={(value) =>
										setEditFormData({
											...editFormData,
											rsvpStatus: parseInt(value, 10) as RsvpStatus,
										})
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={String(RsvpStatus.Ready)}>
											{t(`rsvp_status_${RsvpStatus.Ready}`) || "Ready"}
										</SelectItem>
										<SelectItem value={String(RsvpStatus.Completed)}>
											{t(`rsvp_status_${RsvpStatus.Completed}`) || "Completed"}
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="flex items-center space-x-2">
								<Checkbox
									id="alreadyPaid"
									checked={editFormData.alreadyPaid || false}
									onCheckedChange={(checked) =>
										setEditFormData({
											...editFormData,
											alreadyPaid: checked === true,
										})
									}
								/>
								<label
									htmlFor="alreadyPaid"
									className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									{t("rsvp_already_paid") || "Already Paid"}
								</label>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setEditingIndex(null);
								setEditFormData(null);
							}}
						>
							{t("cancel") || "Cancel"}
						</Button>
						<Button
							onClick={() => {
								if (editingIndex !== null && editFormData) {
									// Update the preview item
									const updatedRsvps = parsedRsvps.map((rsvp, idx) => {
										if (idx === editingIndex) {
											return { ...rsvp, ...editFormData };
										}
										return rsvp;
									});
									setParsedRsvps(updatedRsvps);
									setEditingIndex(null);
									setEditFormData(null);
									toastSuccess({
										description:
											t("reservation_updated") || "Reservation updated",
									});
								}
							}}
						>
							{t("save") || "Save"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
