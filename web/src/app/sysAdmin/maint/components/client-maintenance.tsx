"use client";

import { Button } from "@/components/ui/button";
import { IconSend, IconTrash } from "@tabler/icons-react";
import { deleteAllLedgers } from "@/actions/sysAdmin/maint/delete-all-ledgers";
import { deleteAllOrders } from "@/actions/sysAdmin/maint/delete-all-orders";
import { deleteAllSupportTickets } from "@/actions/sysAdmin/maint/delete-all-support-tickets";
import { deleteAllCustomerCredits } from "@/actions/sysAdmin/maint/delete-all-customer-credits";
import { deleteAllCustomerFiatLedgers } from "@/actions/sysAdmin/maint/delete-all-customer-fiat-ledgers";
import { deleteAllRsvp } from "@/actions/sysAdmin/maint/delete-all-rsvp";
import { deleteAllData } from "@/actions/sysAdmin/maint/delete-all-data";
import { deleteAllNotifications } from "@/actions/sysAdmin/maint/delete-all-notifications";
import { deleteAllSystemLogs } from "@/actions/sysAdmin/maint/delete-all-system-logs";
import { deleteAllMessageQueues } from "@/actions/sysAdmin/maint/delete-all-message-queues";
import { deleteAllEmailQueues } from "@/actions/sysAdmin/maint/delete-all-email-queues";
import { clearUnpaidRsvps } from "@/actions/sysAdmin/maint/clear-unpaid-rsvps";
import { sendTestNoficiation } from "@/actions/sysAdmin/maint/send-test-noficiation";
import { useTransition } from "react";
import { toastError, toastSuccess } from "@/components/toaster";
import { IconLoader } from "@tabler/icons-react";

interface MaintenanceData {
	storeOrderCount: number;
	storeLedgerCount: number;
	ticketCount: number;
	customerCreditLedgerCount: number;
	customerCreditCount: number;
	customerFiatLedgerCount: number;
	rsvpCount: number;
	rsvpBlacklistCount: number;
	rsvpTagCount: number;
	messageQueueCount: number;
	emailQueueCount: number;
	notificationDeliveryStatusCount: number;
	systemLogsCount: number;
	unpaidRsvpCount: number;
}

interface ClientMaintenanceProps {
	data: MaintenanceData;
}

export function ClientMaintenance({ data }: ClientMaintenanceProps) {
	const [isPending, startTransition] = useTransition();

	const handleAction = (action: () => Promise<unknown>) => {
		startTransition(async () => {
			try {
				await action();
			} catch (error) {
				toastError({
					title: "Error",
					description:
						error instanceof Error ? error.message : "An error occurred",
				});
			}
		});
	};

	const handleClearLocalStorage = () => {
		try {
			localStorage.clear();
			toastSuccess({
				description: "All local storage cleared successfully",
			});
		} catch (error) {
			toastError({
				title: "Error",
				description:
					error instanceof Error
						? error.message
						: "Failed to clear local storage",
			});
		}
	};

	const notificationCount =
		data.messageQueueCount +
		data.emailQueueCount +
		data.notificationDeliveryStatusCount;

	const totalCount =
		data.storeOrderCount +
		data.storeLedgerCount +
		data.ticketCount +
		data.customerCreditLedgerCount +
		data.customerCreditCount +
		data.customerFiatLedgerCount +
		data.rsvpCount +
		data.rsvpBlacklistCount +
		data.rsvpTagCount +
		notificationCount +
		data.systemLogsCount;

	return (
		<div className="flex flex-row flex-wrap gap-3 pb-2">
			<div className="relative inline-flex items-center">
				<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1 z-10">
					{totalCount}
				</span>
				<Button
					onClick={() => handleAction(deleteAllData)}
					type="button"
					variant="destructive"
					className="disabled:opacity-50 font-bold"
					size="default"
					disabled={totalCount === 0 || isPending}
				>
					{isPending ? (
						<>
							<IconLoader className="size-4 mr-1 animate-spin" /> Deleting...
						</>
					) : (
						<>
							<IconTrash className="size-4 mr-1" /> Delete ALL Data
						</>
					)}
				</Button>
			</div>

			<div className="relative inline-flex items-center">
				<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1 z-10">
					{data.storeLedgerCount}
				</span>
				<Button
					onClick={() => handleAction(deleteAllLedgers)}
					type="button"
					variant="destructive"
					className="disabled:opacity-50"
					size="sm"
					disabled={data.storeLedgerCount === 0 || isPending}
				>
					<IconTrash className="size-4 mr-1" /> Delete all Ledger data
				</Button>
			</div>

			<div className="relative inline-flex items-center">
				<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1 z-10">
					{data.storeOrderCount}
				</span>
				<Button
					onClick={() => handleAction(deleteAllOrders)}
					type="button"
					variant="destructive"
					className="disabled:opacity-50"
					size="sm"
					disabled={data.storeOrderCount === 0 || isPending}
				>
					<IconTrash className="size-4 mr-1" /> Delete all order data
				</Button>
			</div>

			<div className="relative inline-flex items-center">
				<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1 z-10">
					{data.ticketCount}
				</span>
				<Button
					onClick={() => handleAction(deleteAllSupportTickets)}
					type="button"
					variant="destructive"
					className="disabled:opacity-50"
					size="sm"
					disabled={data.ticketCount === 0 || isPending}
				>
					<IconTrash className="size-4 mr-1" /> Delete all Support Ticket data
				</Button>
			</div>

			<div className="relative inline-flex items-center">
				<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1 z-10">
					{data.customerCreditLedgerCount + data.customerCreditCount}
				</span>
				<Button
					onClick={() => handleAction(deleteAllCustomerCredits)}
					type="button"
					variant="destructive"
					className="disabled:opacity-50"
					size="sm"
					disabled={
						(data.customerCreditLedgerCount === 0 &&
							data.customerCreditCount === 0) ||
						isPending
					}
				>
					<IconTrash className="size-4 mr-1" /> Delete all Customer Credit data
				</Button>
			</div>

			<div className="relative inline-flex items-center">
				<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1 z-10">
					{data.customerFiatLedgerCount}
				</span>
				<Button
					onClick={() => handleAction(deleteAllCustomerFiatLedgers)}
					type="button"
					variant="destructive"
					className="disabled:opacity-50"
					size="sm"
					disabled={data.customerFiatLedgerCount === 0 || isPending}
				>
					<IconTrash className="size-4 mr-1" /> Delete all Customer Fiat Ledger
					data
				</Button>
			</div>

			<div className="relative inline-flex items-center">
				<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1 z-10">
					{data.rsvpCount + data.rsvpBlacklistCount + data.rsvpTagCount}
				</span>
				<Button
					onClick={() => handleAction(deleteAllRsvp)}
					type="button"
					variant="destructive"
					className="disabled:opacity-50"
					size="sm"
					disabled={
						(data.rsvpCount === 0 &&
							data.rsvpBlacklistCount === 0 &&
							data.rsvpTagCount === 0) ||
						isPending
					}
				>
					<IconTrash className="size-4 mr-1" /> Delete all RSVP data
				</Button>
			</div>

			<div className="relative inline-flex items-center">
				<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1 z-10">
					{data.unpaidRsvpCount}
				</span>
				<Button
					onClick={() => handleAction(clearUnpaidRsvps)}
					type="button"
					variant="destructive"
					className="disabled:opacity-50"
					size="sm"
					disabled={data.unpaidRsvpCount === 0 || isPending}
				>
					<IconTrash className="size-4 mr-1" /> Clear unpaid RSVPs
				</Button>
			</div>

			<div className="relative inline-flex items-center">
				<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1 z-10">
					{notificationCount}
				</span>
				<Button
					onClick={() => handleAction(deleteAllNotifications)}
					type="button"
					variant="destructive"
					className="disabled:opacity-50"
					size="sm"
					disabled={notificationCount === 0 || isPending}
				>
					<IconTrash className="size-4 mr-1" /> Delete all Notification data
				</Button>
			</div>

			<div className="relative inline-flex items-center">
				<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1 z-10">
					{data.systemLogsCount}
				</span>
				<Button
					onClick={() => handleAction(deleteAllSystemLogs)}
					type="button"
					variant="destructive"
					className="disabled:opacity-50"
					size="sm"
					disabled={data.systemLogsCount === 0 || isPending}
				>
					<IconTrash className="size-4 mr-1" /> Delete all System Logs
				</Button>
			</div>

			<div className="relative inline-flex items-center">
				<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1 z-10">
					{data.messageQueueCount}
				</span>
				<Button
					onClick={() => handleAction(deleteAllMessageQueues)}
					type="button"
					variant="destructive"
					className="disabled:opacity-50"
					size="sm"
					disabled={data.messageQueueCount === 0 || isPending}
				>
					<IconTrash className="size-4 mr-1" /> Delete all Message Queues
				</Button>
			</div>

			<div className="relative inline-flex items-center">
				<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1 z-10">
					{data.emailQueueCount}
				</span>
				<Button
					onClick={() => handleAction(deleteAllEmailQueues)}
					type="button"
					variant="destructive"
					className="disabled:opacity-50"
					size="sm"
					disabled={data.emailQueueCount === 0 || isPending}
				>
					<IconTrash className="size-4 mr-1" /> Delete all Email Queues
				</Button>
			</div>

			<Button
				onClick={() => handleAction(sendTestNoficiation)}
				type="button"
				variant="default"
				className="disabled:opacity-50"
				size="sm"
				disabled={isPending}
			>
				<IconSend className="size-4 mr-1" /> Send test nofication
			</Button>

			<Button
				onClick={handleClearLocalStorage}
				type="button"
				variant="destructive"
				className="disabled:opacity-50"
				size="sm"
				disabled={isPending}
			>
				<IconTrash className="size-4 mr-1" /> Clear all Local Storage
			</Button>
		</div>
	);
}
