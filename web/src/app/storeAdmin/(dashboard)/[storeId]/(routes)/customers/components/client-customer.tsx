"use client";

import {
	IconBan,
	IconCheck,
	IconCircleDashedCheck,
	IconCopy,
	IconCreditCard,
	IconDots,
	IconDownload,
	IconKey,
	IconLoader,
	IconPillOff,
	IconTrash,
	IconX,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { AxiosError } from "axios";
import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Heading } from "@/components/heading";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";
import type { User } from "@/types";
import { formatDateTime } from "@/utils/datetime-utils";
import clientLogger from "@/lib/client-logger";
import { EditCustomer } from "./edit-customer";
import { UserFilter } from "./filter-user";
import { RechargeCreditDialog } from "./recharge-credit-dialog";
import { ImportCustomerDialog } from "./import-customer-dialog";
import { Role } from "@/types/enum";

interface CustomersClientProps {
	serverData: User[];
}

interface CellActionProps {
	item: User;
	onUpdated?: (newValue: User) => void;
}

// manage customers in this store
// admin can add/review/edit customers in this store
//
export const CustomersClient: React.FC<CustomersClientProps> = ({
	serverData,
}) => {
	const [data, setData] = useState<User[]>(serverData);
	const [searchTerm, setSearchTerm] = useState("");
	const [exporting, setExporting] = useState(false);

	const params = useParams();
	const storeId = params.storeId as string;

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// Memoize filtered data to prevent unnecessary recalculations
	const filteredData = useMemo(() => {
		if (!searchTerm.trim()) {
			return data;
		}

		const searchLower = searchTerm.toLowerCase();
		return data.filter((user) => {
			// Search in name (case-insensitive)
			const nameMatch = user.name?.toLowerCase().includes(searchLower) ?? false;

			// Search in email (case-insensitive)
			const emailMatch =
				user.email?.toLowerCase().includes(searchLower) ?? false;

			// Search in stripeCustomerId (case-insensitive)
			const stripeMatch =
				user.stripeCustomerId?.toLowerCase().includes(searchLower) ?? false;

			// Return true if any field matches (name OR email OR stripeCustomerId)
			return nameMatch || emailMatch || stripeMatch;
		});
	}, [data, searchTerm]);

	const handleFilterChange = useCallback(
		({
			name,
			email,
			stripeCustomerId,
		}: {
			name: string;
			email: string;
			stripeCustomerId: string;
		}) => {
			// Since we're using the same search term for all fields, just use the first non-empty one
			const newSearchTerm =
				name.trim() || email.trim() || stripeCustomerId.trim();
			setSearchTerm(newSearchTerm);
		},
		[],
	);

	/* #region maintain data array on client side */
	const handleCreated = useCallback((newVal: User) => {
		setData((prev) => [
			...prev,
			{
				...newVal,
			},
		]);
	}, []);

	const handleUpdated = useCallback((updatedVal: User) => {
		setData((prev) =>
			prev.map((obj) => (obj.id === updatedVal.id ? updatedVal : obj)),
		);
		clientLogger.info("handleUpdated", {
			metadata: { updatedVal },
			tags: ["handleUpdated"],
			service: "client-user",
			environment: process.env.NODE_ENV,
			version: process.env.npm_package_version,
		});
	}, []);

	const handleDeleted = useCallback((deletedVal: User) => {
		setData((prev) => prev.filter((obj) => obj.id !== deletedVal.id));
		clientLogger.info("handleDeleted", {
			metadata: { deletedVal },
			tags: ["handleDeleted"],
			service: "client-user",
			environment: process.env.NODE_ENV,
			version: process.env.npm_package_version,
		});
	}, []);

	const handleImported = useCallback(() => {
		// Refresh data after import
		window.location.reload();
	}, []);

	const handleExport = useCallback(async () => {
		setExporting(true);
		try {
			const res = await fetch(
				`/api/storeAdmin/${params.storeId}/customers/export`,
				{
					method: "POST",
				},
			);

			// Check if response is an error by status code
			if (!res.ok) {
				// Only parse as JSON if status indicates error
				const contentType = res.headers.get("content-type");
				if (contentType?.includes("application/json")) {
					const errorData = await res.json();
					toastError({
						title: t("export_failed") || "Export failed",
						description: errorData.error || "Unknown error",
					});
				} else {
					const text = await res.text();
					toastError({
						title: t("export_failed") || "Export failed",
						description: text || `HTTP ${res.status}`,
					});
				}
				return;
			}

			// Get filename from Content-Disposition header or use default
			const contentDisposition = res.headers.get("content-disposition");
			let fileName = `customers-export-${params.storeId}.csv`;
			if (contentDisposition) {
				const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
				if (fileNameMatch) {
					fileName = fileNameMatch[1];
				}
			}

			// Create blob and download
			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = fileName;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);

			toastSuccess({
				title: t("exported") || "Exported",
				description: fileName,
			});
		} catch (err: unknown) {
			if (err instanceof Error) {
				toastError({
					title: t("export_failed") || "Export failed",
					description: err.message,
				});
			}
		} finally {
			setExporting(false);
		}
	}, [params.storeId, t]);
	/* #endregion */

	const CellAction: React.FC<CellActionProps> = ({ item }) => {
		const [loading, setLoading] = useState(false);
		const [open, setOpen] = useState(false);
		const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);

		const router = useRouter();

		const onCopy = (id: string) => {
			navigator.clipboard.writeText(id);
			toastSuccess({
				title: "User ID copied to clipboard.",
				description: "",
			});
		};

		return (
			<>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="size-8 p-0">
							<span className="sr-only">{t("open_menu")}</span>
							<IconDots className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
						<DropdownMenuItem
							className="cursor-pointer"
							onClick={() => onCopy(item.id)}
						>
							<IconCopy className="mr-0 size-4" /> {t("copy_user_id")}
						</DropdownMenuItem>
						{item.stripeCustomerId && (
							<DropdownMenuItem
								className="cursor-pointer"
								onClick={() => onCopy(item.stripeCustomerId || "")}
							>
								<IconCopy className="mr-0 size-4" /> {t("copy_stripe_id")}
							</DropdownMenuItem>
						)}

						<DropdownMenuItem
							className="cursor-pointer"
							onClick={() =>
								router.push(`/storeAdmin/${storeId}/customers/${item.email}`)
							}
						>
							<IconCreditCard className="mr-0 size-4" />
							{t("manage_billing")}
						</DropdownMenuItem>
						<DropdownMenuItem
							className="cursor-pointer"
							onSelect={(event) => {
								event.preventDefault();
								setRechargeDialogOpen(true);
							}}
						>
							<IconCreditCard className="mr-0 size-4" />
							{t("credit_recharge") || "Recharge Credit"}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<RechargeCreditDialog
					user={item}
					open={rechargeDialogOpen}
					onOpenChange={setRechargeDialogOpen}
				/>
			</>
		);
	};

	const columns: ColumnDef<User>[] = [
		{
			accessorKey: "name",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title={t("name")} />;
			},
			cell: ({ row }) => {
				return (
					<div className="flex items-center" title={t("user_edit_basic_info")}>
						{row.getValue("name")}
						<EditCustomer item={row.original} onUpdated={handleUpdated} />
					</div>
				);
			},
			enableHiding: false,
		},
		{
			accessorKey: "email",
			header: ({ column }) => {
				return (
					<DataTableColumnHeader column={column} title={t("user_email")} />
				);
			},
			cell: ({ row }) => {
				return (
					<div className="flex items-center">
						{
							//link to /sysAdmin/users/[email]
							<Link
								title="manage user billing"
								className="cursor-pointer text-blue-800 dark:text-blue-200 hover:text-gold"
								href={`/storeAdmin/${storeId}/customers/${row.original.email}`}
							>
								{row.original.email}
							</Link>
						}
					</div>
				);
			},
		},

		{
			accessorKey: "memberRole",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title={t("user_role")} />;
			},
			cell: ({ row }) => {
				return <div className="">{row.original.memberRole}</div>;
			},
		},
		{
			accessorKey: "createdAt",
			header: ({ column }) => {
				return (
					<DataTableColumnHeader
						column={column}
						title={t("user_member_since")}
					/>
				);
			},
			cell: ({ row }) => {
				return (
					<div className="">{formatDateTime(row.getValue("createdAt"))}</div>
				);
			},
		},
		{
			accessorKey: "currentlySignedIn",
			header: ({ column }) => {
				return (
					<DataTableColumnHeader
						column={column}
						title={t("user_signed_in_banned")}
					/>
				);
			},
			cell: ({ row }) => {
				const data = row.original as User;
				const sessions = data.sessions;
				const signedIn = sessions.length > 0;
				const banned = data.banned;

				return (
					<div className="pl-3">
						{signedIn ? (
							<IconCheck className="text-green-400  size-4" />
						) : (
							<IconX className="text-red-400 size-4" />
						)}
						{banned ? <IconX className="text-red-400 size-4" /> : ""}
					</div>
				);
			},
		},
		{
			id: "actions",
			cell: ({ row }) => <CellAction item={row.original as User} />,
		},
	];

	const newUser: Partial<User> & {
		id: string;
		name: string;
		email: string;
		password: string;
		role: string;
		locale: string;
		timezone: string;
		stripeCustomerId: string;
	} = {
		id: "",
		name: "",
		email: "",
		password: "",
		role: Role.user, // Role is defined locally above
		locale: "tw",
		timezone: "Asia/Taipei",
		stripeCustomerId: "",
	};

	const isFiltered = filteredData.length !== data.length;

	const link_home = `/storeAdmin/${storeId}`;
	const link_customers = `/storeAdmin/${storeId}/customers`;

	return (
		<>
			<div className="space-y-4">
				<Breadcrumb className="mb-2">
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink asChild>
								<Link href={link_home}>{t("StoreDashboard")}</Link>
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>{t("Customers")}</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<Heading
						title={t("Customers") || "Customer Management"}
						badge={filteredData.length}
						description={`${t("customers_descr")}${isFiltered ? ` ${filteredData.length} of ${data.length}` : ""}`}
					/>
					<div className="flex flex-wrap gap-1.5 sm:gap-2 sm:content-end items-center">
						<Button
							onClick={handleExport}
							disabled={exporting}
							variant="outline"
							className="h-10 sm:h-9"
						>
							{exporting ? (
								<>
									<IconLoader className="mr-2 h-4 w-4 animate-spin" />
									<span className="text-sm sm:text-xs">
										{t("exporting") || "Exporting..."}
									</span>
								</>
							) : (
								<>
									<IconDownload className="mr-2 h-4 w-4" />
									<span className="text-sm sm:text-xs">
										{t("export") || "Export"}
									</span>
								</>
							)}
						</Button>
						<ImportCustomerDialog onImported={handleImported} />
						<EditCustomer
							item={newUser as unknown as User}
							onUpdated={handleCreated}
							isNew={true}
						/>
					</div>
				</div>
				<UserFilter onFilterChange={handleFilterChange} />

				{/* Filter status indicator */}
				{isFiltered && (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<span>🔍 Filtered results</span>
						<span>•</span>
						<span>
							{filteredData.length} of {data.length} users
						</span>
					</div>
				)}

				<DataTable columns={columns} data={filteredData} />
			</div>
		</>
	);
};
