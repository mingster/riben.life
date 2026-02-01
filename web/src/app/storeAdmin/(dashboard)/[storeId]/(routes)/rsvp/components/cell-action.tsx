"use client";

import {
	IconCheck,
	IconCopy,
	IconDots,
	IconEdit,
	IconTrash,
	IconX,
	IconAlertCircle,
} from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/providers/i18n-provider";

import { deleteRsvpAction } from "@/actions/storeAdmin/rsvp/delete-rsvp";
import { updateRsvpAction } from "@/actions/storeAdmin/rsvp/update-rsvp";
import { cancelRsvpAction } from "@/actions/storeAdmin/rsvp/cancel-rsvp";
import { completeRsvpAction } from "@/actions/storeAdmin/rsvp/complete-rsvp";
import { noShowRsvpAction } from "@/actions/storeAdmin/rsvp/no-show-rsvp";
import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { epochToDate } from "@/utils/datetime-utils";
import { AdminEditRsvpDialog } from "./admin-edit-rsvp-dialog";

interface CellActionProps {
	data: Rsvp;
	onDeleted?: (rsvpId: string) => void;
	onUpdated?: (rsvp: Rsvp) => void;
	storeTimezone?: string;
	rsvpSettings?: {
		minPrepaidPercentage?: number | null;
		canCancel?: boolean | null;
		cancelHours?: number | null;
	} | null;
}

export const CellAction: React.FC<CellActionProps> = ({
	data,
	onDeleted,
	onUpdated,
	storeTimezone = "Asia/Taipei",
	rsvpSettings,
}) => {
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const onConfirm = async () => {
		try {
			setLoading(true);
			const result = await deleteRsvpAction(String(params.storeId), {
				id: data.id,
			});

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
				return;
			}

			toastSuccess({
				title: t("rsvp") + " " + t("deleted"),
				description: "",
			});
			onDeleted?.(data.id);
		} catch (error: unknown) {
			toastError({
				title: t("error_title"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setLoading(false);
			setOpen(false);
		}
	};

	const onCopy = (id: string) => {
		navigator.clipboard.writeText(id);
		toastSuccess({
			title: "Rsvp ID copied to clipboard.",
			description: "",
		});
	};

	const onConfirmRsvp = async () => {
		if (data.status !== RsvpStatus.ReadyToConfirm) {
			return;
		}

		try {
			setLoading(true);

			// Convert rsvpTime from epoch to Date
			const rsvpTimeEpoch =
				typeof data.rsvpTime === "number"
					? BigInt(data.rsvpTime)
					: data.rsvpTime instanceof Date
						? BigInt(data.rsvpTime.getTime())
						: data.rsvpTime;
			const rsvpTimeDate = epochToDate(rsvpTimeEpoch);

			if (!rsvpTimeDate) {
				toastError({
					title: t("error_title"),
					description: "Invalid reservation time",
				});
				return;
			}

			// Convert arriveTime if it exists
			let arriveTimeDate: Date | null = null;
			if (data.arriveTime) {
				const arriveTimeEpoch =
					typeof data.arriveTime === "number"
						? BigInt(data.arriveTime)
						: data.arriveTime instanceof Date
							? BigInt(data.arriveTime.getTime())
							: data.arriveTime;
				arriveTimeDate = epochToDate(arriveTimeEpoch);
			}

			const result = await updateRsvpAction(String(params.storeId), {
				id: data.id,
				customerId: data.customerId || null,
				facilityId: data.facilityId || "",
				serviceStaffId: data.serviceStaffId || null,
				numOfAdult: data.numOfAdult || 1,
				numOfChild: data.numOfChild || 0,
				rsvpTime: rsvpTimeDate,
				arriveTime: arriveTimeDate,
				status:
					data.status === RsvpStatus.ReadyToConfirm
						? RsvpStatus.Ready
						: data.status,
				message: data.message || null,
				alreadyPaid: data.alreadyPaid || false,
				confirmedByStore: true, // Set to true
				confirmedByCustomer: data.confirmedByCustomer || false,
				facilityCost: data.facilityCost ? Number(data.facilityCost) : null,
				pricingRuleId: data.pricingRuleId || null,
			});

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
				return;
			}

			if (result?.data?.rsvp) {
				toastSuccess({
					title: t("rsvp_confirmed_by_store"),
					description: "",
				});
				onUpdated?.(result.data.rsvp);
			}
		} catch (error: unknown) {
			toastError({
				title: t("error_title"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setLoading(false);
		}
	};

	const onCompleteRsvp = async () => {
		if (data.status !== RsvpStatus.Ready) {
			return;
		}

		try {
			setLoading(true);

			const result = await completeRsvpAction(String(params.storeId), {
				id: data.id,
			});

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
				return;
			}

			if (result?.data?.rsvp) {
				toastSuccess({
					title: t("rsvp_completed"),
					description: "",
				});
				onUpdated?.(result.data.rsvp);
			}
		} catch (error: unknown) {
			toastError({
				title: t("error_title"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setLoading(false);
		}
	};

	const onCancelRsvp = async () => {
		// Don't allow canceling if already cancelled
		if (data.status === RsvpStatus.Cancelled) {
			return;
		}

		try {
			setLoading(true);

			const result = await cancelRsvpAction(String(params.storeId), {
				id: data.id,
			});

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
				return;
			}

			if (result?.data?.rsvp) {
				toastSuccess({
					title: t("rsvp_cancelled"),
					description: "",
				});
				onUpdated?.(result.data.rsvp);
			}
		} catch (error: unknown) {
			toastError({
				title: t("error_title"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setLoading(false);
		}
	};

	const onNoShowRsvp = async () => {
		if (data.status !== RsvpStatus.Ready) {
			return;
		}

		try {
			setLoading(true);

			const result = await noShowRsvpAction(String(params.storeId), {
				id: data.id,
			});

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
				return;
			}

			if (result?.data?.rsvp) {
				toastSuccess({
					title: t("rsvp_marked_as_no_show"),
					description: "",
				});
				onUpdated?.(result.data.rsvp);
			}
		} catch (error: unknown) {
			toastError({
				title: t("error_title"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<AlertModal
				isOpen={open}
				onClose={() => setOpen(false)}
				onConfirm={onConfirm}
				loading={loading}
			/>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="size-8 p-0">
						<span className="sr-only">Open menu</span>
						<IconDots className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
					{data.status === RsvpStatus.ReadyToConfirm && (
						<DropdownMenuItem
							className="cursor-pointer"
							onClick={onConfirmRsvp}
							disabled={loading}
						>
							<IconEdit className="mr-0 size-4" />
							{t("rsvp_confirm_this_rsvp")}
						</DropdownMenuItem>
					)}
					{(data.status === RsvpStatus.Ready ||
						data.status === RsvpStatus.CheckedIn) && (
						<DropdownMenuItem
							className="cursor-pointer"
							onClick={onCompleteRsvp}
							disabled={loading}
						>
							<IconCheck className="mr-0 size-4" />
							{t("rsvp_complete_this_rsvp")}
						</DropdownMenuItem>
					)}
					{data.status === RsvpStatus.Ready && (
						<DropdownMenuItem
							className="cursor-pointer"
							onClick={onNoShowRsvp}
							disabled={loading}
						>
							<IconAlertCircle className="mr-0 size-4" />
							{t("rsvp_no_show_this_rsvp")}
						</DropdownMenuItem>
					)}
					<DropdownMenuItem
						className="cursor-pointer"
						onClick={onCancelRsvp}
						disabled={loading}
					>
						<IconX className="mr-0 size-4" />
						{t("rsvp_cancel_this_rsvp")}
					</DropdownMenuItem>

					<DropdownMenuItem
						className="cursor-pointer"
						onSelect={(event) => {
							event.preventDefault();
							setIsEditOpen(true);
						}}
					>
						<IconEdit className="mr-0 size-4" /> {t("edit")}
					</DropdownMenuItem>

					{data.status === RsvpStatus.Pending && (
						<DropdownMenuItem
							className="cursor-pointer"
							onClick={() => setOpen(true)}
						>
							<IconTrash className="mr-0 size-4" /> {t("delete")}
						</DropdownMenuItem>
					)}
					{data.status !== RsvpStatus.Cancelled && (
						<DropdownMenuItem
							className="cursor-pointer"
							onClick={() => onCopy(data.id)}
						>
							<IconCopy className="mr-0 size-4" />
							{t("copy_id")}
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			<AdminEditRsvpDialog
				storeId={String(params.storeId)}
				rsvpSettings={rsvpSettings || null}
				storeSettings={null}
				rsvp={data}
				onReservationUpdated={onUpdated}
				open={isEditOpen}
				onOpenChange={setIsEditOpen}
				storeTimezone={storeTimezone}
				storeUseBusinessHours={null}
			/>
		</>
	);
};
