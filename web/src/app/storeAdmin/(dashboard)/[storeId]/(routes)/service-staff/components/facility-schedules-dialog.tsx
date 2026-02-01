"use client";

import { useTranslation } from "@/app/i18n/client";
import { Loader } from "@/components/loader";
import { toastError, toastSuccess } from "@/components/toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/providers/i18n-provider";
import {
	IconCalendar,
	IconEdit,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { deleteServiceStaffScheduleAction } from "@/actions/storeAdmin/serviceStaffSchedule/delete-service-staff-schedule";
import { getServiceStaffSchedulesAction } from "@/actions/storeAdmin/serviceStaffSchedule/get-service-staff-schedules";
import type { ServiceStaffColumn } from "../service-staff-column";
import { EditScheduleDialog } from "./edit-schedule-dialog";

interface FacilitySchedulesDialogProps {
	serviceStaff: ServiceStaffColumn;
	facilities: Array<{ id: string; facilityName: string }>;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

interface ScheduleItem {
	id: string;
	facilityId: string | null;
	facilityName: string | null;
	businessHours: string;
	isActive: boolean;
	priority: number;
	effectiveFrom: bigint | null;
	effectiveTo: bigint | null;
}

export function FacilitySchedulesDialog({
	serviceStaff,
	facilities,
	open,
	onOpenChange,
}: FacilitySchedulesDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [loading, setLoading] = useState(false);
	const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
	const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(
		null,
	);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isCreating, setIsCreating] = useState(false);

	//console.log("serviceStaff", serviceStaff);

	// Fetch schedules when dialog opens
	const fetchSchedules = useCallback(async () => {
		if (!open || !serviceStaff?.id) return;

		setLoading(true);
		try {
			const result = await getServiceStaffSchedulesAction(
				String(params.storeId),
				{ serviceStaffId: serviceStaff.id },
			);

			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}

			if (result?.data?.schedules) {
				const raw = result.data.schedules as Array<{
					id: string;
					facilityId: string | null;
					businessHours: string;
					isActive: boolean;
					priority: number;
					effectiveFrom: bigint | null;
					effectiveTo: bigint | null;
					Facility?: { facilityName: string } | null;
				}>;
				setSchedules(
					raw.map((s) => ({
						id: s.id,
						facilityId: s.facilityId,
						facilityName: s.Facility?.facilityName ?? null,
						businessHours: s.businessHours,
						isActive: s.isActive,
						priority: s.priority,
						effectiveFrom: s.effectiveFrom,
						effectiveTo: s.effectiveTo,
					})),
				);
			}
		} catch (error) {
			toastError({
				description:
					error instanceof Error ? error.message : "Failed to load schedules",
			});
		} finally {
			setLoading(false);
		}
	}, [open, serviceStaff?.id, params.storeId]);

	useEffect(() => {
		fetchSchedules();
	}, [fetchSchedules]);

	// Handle delete
	const handleDelete = useCallback(
		async (scheduleId: string) => {
			if (
				!confirm(
					t("confirm_delete") ||
						"Are you sure you want to delete this schedule?",
				)
			) {
				return;
			}

			try {
				const result = await deleteServiceStaffScheduleAction(
					String(params.storeId),
					{ id: scheduleId },
				);

				if (result?.serverError) {
					toastError({ description: result.serverError });
					return;
				}

				setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
				toastSuccess({
					description: t("schedule_deleted") || "Schedule deleted",
				});
			} catch (error) {
				toastError({
					description:
						error instanceof Error
							? error.message
							: "Failed to delete schedule",
				});
			}
		},
		[params.storeId, t],
	);

	// Handle edit
	const handleEdit = useCallback((schedule: ScheduleItem) => {
		setEditingSchedule(schedule);
		setIsCreating(false);
		setIsEditDialogOpen(true);
	}, []);

	// Handle create
	const handleCreate = useCallback(() => {
		setEditingSchedule(null);
		setIsCreating(true);
		setIsEditDialogOpen(true);
	}, []);

	// Handle schedule saved
	const handleScheduleSaved = useCallback(
		(schedule: ScheduleItem) => {
			if (isCreating) {
				setSchedules((prev) => [...prev, schedule]);
			} else {
				setSchedules((prev) =>
					prev.map((s) => (s.id === schedule.id ? schedule : s)),
				);
			}
			setIsEditDialogOpen(false);
			setEditingSchedule(null);
		},
		[isCreating],
	);

	// Check if has default schedule (facilityId = null)
	const hasDefaultSchedule = useMemo(
		() => schedules.some((s) => s.facilityId === null),
		[schedules],
	);

	// Parse business hours for display
	const formatBusinessHours = useCallback(
		(hoursJson: string): string => {
			try {
				const hours = JSON.parse(hoursJson);
				const days = [
					"Monday",
					"Tuesday",
					"Wednesday",
					"Thursday",
					"Friday",
					"Saturday",
					"Sunday",
				];
				const openDays = days.filter(
					(day) => hours[day] && hours[day] !== "closed",
				);
				return openDays.length > 0
					? `${openDays.length} ${t("days_open") || "days open"}`
					: t("closed") || "Closed";
			} catch {
				return t("invalid_format") || "Invalid format";
			}
		},
		[t],
	);

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<IconCalendar className="h-5 w-5" />
							{t("facility_schedules") || "Facility Schedules"}
						</DialogTitle>
						<DialogDescription>
							{t("facility_schedules_description") ||
								"Configure availability for"}{" "}
							<strong>{serviceStaff.userName || serviceStaff.userEmail}</strong>
						</DialogDescription>
					</DialogHeader>

					{loading ? (
						<div className="flex justify-center py-8">
							<Loader />
						</div>
					) : (
						<div className="space-y-4">
							{/* Add schedule button */}
							<div className="flex justify-end">
								<Button
									onClick={handleCreate}
									size="sm"
									className="h-10 sm:h-9 sm:min-h-0"
								>
									<IconPlus className="h-4 w-4 mr-2" />
									{t("add_schedule") || "Add Schedule"}
								</Button>
							</div>

							{/* Schedules table */}
							{schedules.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">
									<IconCalendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
									<p>{t("no_schedules") || "No schedules configured"}</p>
									<p className="text-sm">
										{t("no_schedules_hint") ||
											"Staff is available at all times. Add a schedule to restrict availability."}
									</p>
								</div>
							) : (
								<div className="border rounded-md">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>{t("facility") || "Facility"}</TableHead>
												<TableHead>
													{t("business_hours") || "Business Hours"}
												</TableHead>
												<TableHead className="text-center">
													{t("Status") || "Status"}
												</TableHead>
												<TableHead className="text-right">
													{t("Actions") || "Actions"}
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{schedules.map((schedule) => (
												<TableRow key={schedule.id}>
													<TableCell>
														{schedule.facilityId === null ? (
															<Badge variant="secondary">
																{t("default_all_facilities") ||
																	"Default (All Facilities)"}
															</Badge>
														) : (
															schedule.facilityName || schedule.facilityId
														)}
													</TableCell>
													<TableCell className="font-mono text-xs">
														{formatBusinessHours(schedule.businessHours)}
													</TableCell>
													<TableCell className="text-center">
														<Badge
															variant={
																schedule.isActive ? "default" : "outline"
															}
														>
															{schedule.isActive
																? t("active") || "Active"
																: t("Inactive") || "Inactive"}
														</Badge>
													</TableCell>
													<TableCell className="text-right">
														<div className="flex items-center justify-end gap-1">
															<Button
																variant="ghost"
																size="icon"
																onClick={() => handleEdit(schedule)}
																className="h-8 w-8"
															>
																<IconEdit className="h-4 w-4" />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																onClick={() => handleDelete(schedule.id)}
																className="h-8 w-8 text-destructive hover:text-destructive"
															>
																<IconTrash className="h-4 w-4" />
															</Button>
														</div>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}

							{/* Help text */}
							<div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 space-y-1">
								<p>
									<strong>{t("how_it_works") || "How it works"}:</strong>
								</p>
								<p>
									1.{" "}
									{t("schedule_priority_1") ||
										"Facility-specific schedules take priority over default schedules"}
								</p>
								<p>
									2.{" "}
									{t("schedule_priority_2") ||
										"Default schedule (All Facilities) is used when no facility-specific schedule exists"}
								</p>
								<p>
									3.{" "}
									{t("schedule_priority_3") ||
										"If no schedules are configured, staff is available at all times"}
								</p>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* Edit/Create Schedule Dialog */}
			<EditScheduleDialog
				open={isEditDialogOpen}
				onOpenChange={setIsEditDialogOpen}
				serviceStaffId={serviceStaff.id}
				schedule={editingSchedule}
				facilities={facilities}
				hasDefaultSchedule={hasDefaultSchedule && !editingSchedule}
				onSaved={handleScheduleSaved}
			/>
		</>
	);
}
