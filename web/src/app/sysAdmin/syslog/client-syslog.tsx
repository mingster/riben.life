"use client";
import { DataTable } from "@/components/dataTable";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Heading } from "@/components/heading";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { IconAlertCircle, IconCheck, IconX } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState } from "react";

import { Loader } from "@/components/loader";
import { Separator } from "@/components/ui/separator";
import type { SystemLog } from "@/types";
import { formatDateTime } from "@/utils/datetime-utils";
import { format } from "date-fns";

export const SystemLogClient: React.FC = () => {
	const [data, setData] = useState<SystemLog[]>();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [currentTime, setCurrentTime] = useState(new Date());
	const [openDeleteAll, setOpenDeleteAll] = useState(false);
	//const { lng } = useI18n();
	//const { t } = useTranslation(lng);

	/* #region maintain data array on client side */

	/* #endregion */

	const columns: ColumnDef<SystemLog>[] = [
		{
			accessorKey: "timestamp",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="timestamp" />;
			},
			cell: ({ row }) => {
				return (
					<div className="font-mono text-xs text-gray-500 text-wrap">
						{formatDateTime(row.getValue("timestamp"))}
					</div>
				);
			},
		},
		{
			accessorKey: "level",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="level" />;
			},
			cell: ({ row }) => {
				const val =
					row.getValue("level") === "info" ? (
						<IconCheck className="text-green-400  size-4" />
					) : row.getValue("level") === "error" ? (
						<IconX className="text-red-400 size-4" />
					) : (
						<IconAlertCircle className="text-yellow-400 size-4" />
					);

				return <div className="pl-3">{val}</div>;
			},
		},
		{
			accessorKey: "message",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="message" />;
			},
			cell: ({ row }) => {
				return (
					<div className="font-mono text-xs text-gray-500 text-wrap">
						{row.getValue("message")}
					</div>
				);
			},
		},
		{
			id: "data",
			header: ({ column }) => {
				return <div className="">Data</div>;
			},
			cell: ({ row }) => (
				<div className="pl-0 flex flex-col gap-1 font-mono text-xs text-gray-500 text-wrap">
					<div>{row.original.service}</div>
					<div>{row.original.environment}</div>
					<div>{row.original.version}</div>
					<div>{row.original.requestId}</div>
					<div>{row.original.userId}</div>
					<div>{row.original.sessionId}</div>
					<div>{row.original.ip}</div>
					<div className="text-wrap">{row.original.userAgent}</div>
					<div>{row.original.url}</div>
					<div>{row.original.method}</div>
					<div>{row.original.statusCode}</div>
					<div>{row.original.duration}</div>
					<div>{row.original.errorCode}</div>
					<div>{row.original.stackTrace}</div>
					<div className="text-wrap">{row.original.metadata}</div>
					<div>{row.original.tags}</div>
					<div>{row.original.source}</div>
					<div>{row.original.line}</div>
					<div>{row.original.column}</div>
				</div>
			),
		},
	];

	useEffect(() => {
		const fetchSystemLogs = async () => {
			try {
				const response = await fetch("/api/sysAdmin/syslog");
				const data = await response.json();
				setData(data);
				setLoading(false);
			} catch (error) {
				setError(error as string);
				setLoading(false);
			}
		};

		setLoading(true);
		setError(null);

		// Emit immediately and then every 10 seconds
		const interval = setInterval(() => {
			fetchSystemLogs();
		}, 10000);

		// Update current time every 10 second
		const timerId = setInterval(() => {
			setCurrentTime(new Date());
		}, 10000);

		return () => {
			//socket.off("online_peers", handlePeers);
			clearInterval(interval);
			clearInterval(timerId);
		};
	}, []);

	const handleDeleteAll = async () => {
		try {
			const response = await fetch("/api/sysAdmin/syslog", {
				method: "DELETE",
			});
			const data = await response.json();

			console.log(data);
			toastSuccess({
				title: "Success",
				description: data.message,
			});
			setOpenDeleteAll(false);
			setData([]);
		} catch (error) {
			toastError({
				title: "Error",
				description: error as string,
			});
		}
	};

	if (loading) return <Loader />;
	if (error) return <div className="text-red-500">{error}</div>;

	return (
		<>
			<AlertModal
				isOpen={openDeleteAll}
				onClose={() => setOpenDeleteAll(false)}
				onConfirm={handleDeleteAll}
				loading={false}
			/>
			<div className="flex items-center justify-between">
				<Heading
					title="System Logs"
					badge={data?.length}
					description={`Manage system logs. (${format(currentTime, "yyyy-MM-dd HH:mm:ss")})`}
				/>
				<Button variant="destructive" onClick={() => setOpenDeleteAll(true)}>
					Delete All
				</Button>
			</div>
			<Separator />
			<DataTable columns={columns} data={data || []} defaultPageSize={500} />
		</>
	);
};
