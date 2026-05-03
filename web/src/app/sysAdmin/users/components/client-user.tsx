"use client";

import {
	IconBan,
	IconCheck,
	IconCircleDashedCheck,
	IconCopy,
	IconCreditCard,
	IconDots,
	IconKey,
	IconPillOff,
	IconTrash,
	IconX,
} from "@tabler/icons-react";
import { deleteUserAction } from "@/actions/sysAdmin/user/delete-user";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import CurrencyComponent from "@/components/currency";
import { DataTable } from "@/components/dataTable";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Heading } from "@/components/heading";
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
import { authClient } from "@/lib/auth-client";
import clientLogger from "@/lib/client-logger";
import { useI18n } from "@/providers/i18n-provider";
import type { User } from "@/types";
import { formatDateTime } from "@/utils/datetime-utils";
import { EditUser } from "./edit-user";
import { UserFilter } from "./filter-user";
import { ResetPasswordDialog } from "./reset-password-dialog";

interface UsersClientProps {
	serverData: UserListItem[];
}

interface CellActionProps {
	item: UserListItem;
	onUpdated?: (newValue: UserListItem) => void;
}

export type UserListItem = User & {
	customerCreditFiat: number;
	customerCreditPoint: number;
	totalSpending: number;
	completedReservations: number;
};

export const UsersClient: React.FC<UsersClientProps> = ({ serverData }) => {
	const [data, setData] = useState<UserListItem[]>(serverData);
	const [searchTerm, setSearchTerm] = useState("");

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

			// Search in phoneNumber (case-insensitive)
			const phoneMatch =
				user.phoneNumber?.toLowerCase().includes(searchLower) ?? false;

			// Return true if any field matches (name OR email OR stripeCustomerId OR phoneNumber)
			return nameMatch || emailMatch || stripeMatch || phoneMatch;
		});
	}, [data, searchTerm]);

	const handleFilterChange = useCallback(
		({
			name,
			email,
			stripeCustomerId,
			phoneNumber,
		}: {
			name: string;
			email: string;
			stripeCustomerId: string;
			phoneNumber: string;
		}) => {
			// Since we're using the same search term for all fields, just use the first non-empty one
			const newSearchTerm =
				name.trim() ||
				email.trim() ||
				stripeCustomerId.trim() ||
				phoneNumber.trim();
			setSearchTerm(newSearchTerm);
		},
		[],
	);

	/* #region maintain data array on client side */
	const handleCreated = useCallback((newVal: UserListItem) => {
		setData((prev) => [
			...prev,
			{
				...newVal,
			},
		]);
	}, []);

	const handleUpdated = useCallback((updatedVal: User) => {
		setData((prev) =>
			prev.map((obj) =>
				obj.id === updatedVal.id
					? ({ ...obj, ...updatedVal } as UserListItem)
					: obj,
			),
		);
		clientLogger.info("handleUpdated", {
			metadata: { updatedVal },
			tags: ["handleUpdated"],
			service: "client-user",
			environment: process.env.NODE_ENV,
			version: process.env.npm_package_version,
		});
	}, []);

	const handleDeleted = useCallback((deletedVal: UserListItem) => {
		setData((prev) => prev.filter((obj) => obj.id !== deletedVal.id));
		clientLogger.info("handleDeleted", {
			metadata: { deletedVal },
			tags: ["handleDeleted"],
			service: "client-user",
			environment: process.env.NODE_ENV,
			version: process.env.npm_package_version,
		});
	}, []);
	/* #endregion */

	const CellAction: React.FC<CellActionProps> = ({ item }) => {
		const [loading, setLoading] = useState(false);
		const [open, setOpen] = useState(false);

		const router = useRouter();

		//ban user
		const onConfirm = async () => {
			try {
				setLoading(true);

				const email = item.email;
				if (!email) {
					toastError({
						title: "Cannot delete user",
						description: "This user has no email address.",
					});
					return;
				}

				const result = await deleteUserAction({ userEmail: email });
				if (result?.serverError) {
					toastError({
						title: "something wrong.",
						description: result.serverError,
					});
					return;
				}

				toastSuccess({
					title: "User deleted.",
					description: "",
				});
				clientLogger.info("User deleted successfully", {
					metadata: { userId: item.id, userEmail: email },
					tags: ["onConfirm"],
					service: "client-user",
					environment: process.env.NODE_ENV,
					version: process.env.npm_package_version,
				});

				handleDeleted(item);
			} catch (error: unknown) {
				toastError({
					title: "something wrong.",
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
				title: "User ID copied to clipboard.",
				description: "",
			});
		};

		const banUser = async (id: string) => {
			const bannedUser = await authClient.admin.banUser({
				userId: id,
			});
			clientLogger.info("User banned successfully", {
				message: "User banned successfully",
				metadata: { bannedUser: bannedUser?.data },
				tags: ["banUser"],
				service: "client-user",
				environment: process.env.NODE_ENV,
				version: process.env.npm_package_version,
			});

			// revoke user sessions
			revokesUserSessions(id);

			//update data in the table
			item.banned = true;
			handleUpdated(item);

			toastSuccess({
				title: "User banned.",
				description: "",
			});
		};

		const unBanUser = async (id: string) => {
			const _unbannedUser = await authClient.admin.unbanUser({
				userId: id,
			});

			item.banned = false;
			handleUpdated(item);

			toastSuccess({
				title: "User unbanned.",
				description: "",
			});
		};

		const revokesUserSessions = async (id: string) => {
			const _revokedSessions = await authClient.admin.revokeUserSessions({
				userId: id,
			});

			const sessions = await authClient.admin.listUserSessions({
				userId: id,
			});

			if (sessions.data?.sessions) {
				// Map SessionWithImpersonatedBy to Session format
				item.sessions = sessions.data.sessions.map((s) => ({
					id: s.id,
					userId: s.userId,
					token: s.token,
					expiresAt: s.expiresAt,
					ipAddress: s.ipAddress ?? null,
					userAgent: s.userAgent ?? null,
					createdAt: s.createdAt,
					updatedAt: s.updatedAt,
					impersonatedBy: s.impersonatedBy ?? null,
					activeOrganizationId:
						(s as { activeOrganizationId?: string | null })
							.activeOrganizationId ?? null,
				}));
				handleUpdated(item);
			}

			toastSuccess({
				title: "User session(s) revoked.",
				description: "",
			});
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
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuItem
							className="cursor-pointer"
							onClick={() => onCopy(item.id)}
						>
							<IconCopy className="mr-0 size-4" /> Copy User Id
						</DropdownMenuItem>
						{item.stripeCustomerId && (
							<DropdownMenuItem
								className="cursor-pointer"
								onClick={() => onCopy(item.stripeCustomerId || "")}
							>
								<IconCopy className="mr-0 size-4" /> Copy Stripe ID
							</DropdownMenuItem>
						)}

						<DropdownMenuItem
							className="cursor-pointer"
							onClick={() => setOpen(true)}
						>
							<IconTrash className="mr-0 size-4" /> Delete User
						</DropdownMenuItem>

						<DropdownMenuItem
							className="cursor-pointer"
							onClick={() => banUser(item.id)}
						>
							<IconBan className="mr-0 size-4" /> Ban User
						</DropdownMenuItem>

						<DropdownMenuItem
							className="cursor-pointer"
							onClick={() => unBanUser(item.id)}
						>
							<IconCircleDashedCheck className="mr-0 size-4" /> Unban User
						</DropdownMenuItem>

						<DropdownMenuItem
							className="cursor-pointer"
							onClick={() => revokesUserSessions(item.id)}
						>
							<IconPillOff className="mr-0 size-4" />
							Revokes all sessions
						</DropdownMenuItem>

						<ResetPasswordDialog user={item}>
							<DropdownMenuItem
								className="cursor-pointer"
								onSelect={(e) => e.preventDefault()}
							>
								<IconKey className="mr-0 size-4" />
								Set Password
							</DropdownMenuItem>
						</ResetPasswordDialog>

						<DropdownMenuItem
							className="cursor-pointer"
							onClick={() => router.push(`/sysAdmin/users/${item.email}`)}
						>
							<IconCreditCard className="mr-0 size-4" />
							Manage Billing
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</>
		);
	};

	const columns: ColumnDef<UserListItem>[] = [
		{
			accessorKey: "name",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="name" />;
			},
			cell: ({ row }) => {
				return (
					<div className="flex items-center" title="edit basic info">
						<Link
							title="manage user billing"
							className="hover:text-gold"
							href={`/sysAdmin/users/${row.original.email}`}
						>
							{row.getValue("name")}
						</Link>

						<EditUser item={row.original} onUpdated={handleUpdated} />
					</div>
				);
			},
			enableHiding: false,
		},
		{
			id: "spendingAndReservations",
			accessorFn: (row) => {
				return row.totalSpending ?? 0;
			},
			header: ({ column }) => {
				return (
					<DataTableColumnHeader
						column={column}
						className="text-right items-end"
						title={
							t("customer_spending_reservations") ||
							"total spending / # of reservations"
						}
					/>
				);
			},
			cell: ({ row }) => {
				const user = row.original;
				const totalSpending = user.totalSpending ?? 0;
				const completedReservations = user.completedReservations ?? 0;

				return (
					<div className="flex flex-col gap-0.5 text-right">
						<CurrencyComponent value={totalSpending} />
						<span className="text-xs text-muted-foreground">
							{t("rsvp") || "RSVP"}: {completedReservations}
						</span>
					</div>
				);
			},
		},
		{
			accessorKey: "customerCreditFiat",
			header: ({ column }) => {
				return (
					<DataTableColumnHeader
						column={column}
						title={`${t("customer_fiat_amount")} / ${t("customer_credit_amount")}`}
					/>
				);
			},
			cell: ({ row }) => {
				const fiat = row.original.customerCreditFiat ?? 0;
				const point = row.original.customerCreditPoint ?? 0;
				return (
					<div className="flex flex-col gap-0.5 text-right">
						<CurrencyComponent value={fiat} />
						<span className="text-xs text-muted-foreground">
							{Number(point).toFixed(0)}
							{t("points") || "pts"}
						</span>
					</div>
				);
			},
		},
		{
			accessorKey: "role",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="role" />;
			},
		},
		{
			accessorKey: "createdAt",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="member since" />;
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
					<DataTableColumnHeader column={column} title="signed-in/banned?" />
				);
			},
			cell: ({ row }) => {
				const data = row.original;
				const sessions = data.sessions ?? [];
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
			accessorKey: "stripeCustomerId",
			header: ({ column }) => {
				return (
					<DataTableColumnHeader column={column} title="Stripe Customer ID" />
				);
			},
			cell: ({ row }) => {
				const stripeId = row.original.stripeCustomerId;
				return (
					<div className="flex items-center">
						{stripeId ? (
							<span className="font-mono text-xs bg-muted px-2 py-1 rounded">
								{stripeId}
							</span>
						) : (
							<span className="text-muted-foreground text-sm">-</span>
						)}
					</div>
				);
			},
		},
		{
			id: "actions",
			cell: ({ row }) => <CellAction item={row.original} />,
		},
	];

	const newUser: Partial<UserListItem> &
		Pick<
			User,
			| "id"
			| "name"
			| "email"
			| "role"
			| "locale"
			| "timezone"
			| "stripeCustomerId"
		> = {
		id: "",
		name: "",
		email: "",
		role: "user",
		locale: "tw",
		timezone: "Asia/Taipei",
		stripeCustomerId: "",
		customerCreditFiat: 0,
		customerCreditPoint: 0,
		totalSpending: 0,
		completedReservations: 0,
	};

	const isFiltered = filteredData.length !== data.length;

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<Heading
					title="Customers"
					badge={filteredData.length}
					description={`Manage customers in this system.${isFiltered ? ` Showing ${filteredData.length} of ${data.length} users` : ""}`}
				/>
				<div className="flex gap-1 content-end">
					<UserFilter onFilterChange={handleFilterChange} />
					<EditUser
						item={newUser as User}
						onUpdated={(newValue) =>
							handleCreated({
								...newValue,
								customerCreditFiat: 0,
								customerCreditPoint: 0,
								totalSpending: 0,
								completedReservations: 0,
							})
						}
						isNew={true}
					/>
				</div>
			</div>

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
	);
};
