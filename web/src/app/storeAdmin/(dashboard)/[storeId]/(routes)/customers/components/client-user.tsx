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
import { EditUser } from "./edit-user";
import { UserFilter } from "./filter-user";
import { ResetPasswordDialog } from "./reset-password-dialog";

interface UsersClientProps {
	serverData: User[];
}

interface CellActionProps {
	item: User;
	onUpdated?: (newValue: User) => void;
}

export const UsersClient: React.FC<UsersClientProps> = ({ serverData }) => {
	const [data, setData] = useState<User[]>(serverData);
	const [searchTerm, setSearchTerm] = useState("");

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
	/* #endregion */

	const CellAction: React.FC<CellActionProps> = ({ item }) => {
		const [loading, setLoading] = useState(false);
		const [open, setOpen] = useState(false);

		const router = useRouter();

		const onConfirm = async () => {
			try {
				setLoading(true);

				//get user's email from item
				await axios.delete(
					`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${storeId}/customers/${item.email}`,
				);

				//delete user
				const deletedUser = await authClient.admin.removeUser({
					userId: item.id,
				});

				toastSuccess({
					title: "User deleted.",
					description: "",
				});
				clientLogger.info("User deleted successfully", {
					metadata: { deletedUser: deletedUser?.data },
					tags: ["onConfirm"],
					service: "client-user",
					environment: process.env.NODE_ENV,
					version: process.env.npm_package_version,
				});

				// also update data from parent component or caller
				handleDeleted(item);
			} catch (error: unknown) {
				const err = error as AxiosError;
				toastError({
					title: "something wrong.",
					description: err.message,
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
			item.banned = 1;
			handleUpdated(item);

			toastSuccess({
				title: "User banned.",
				description: "",
			});
		};

		const unBanUser = async (id: string) => {
			const unbannedUser = await authClient.admin.unbanUser({
				userId: id,
			});

			item.banned = 0;
			handleUpdated(item);

			toastSuccess({
				title: "User unbanned.",
				description: "",
			});
		};

		const revokesUserSessions = async (id: string) => {
			const revokedSessions = await authClient.admin.revokeUserSessions({
				userId: id,
			});

			const sessions = await authClient.admin.listUserSessions({
				userId: id,
			});

			item.session = sessions.data;
			handleUpdated(item);

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
								onClick={() => onCopy(item.stripeCustomerId)}
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

	const columns: ColumnDef<User>[] = [
		{
			accessorKey: "name",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="name" />;
			},
			cell: ({ row }) => {
				return (
					<div className="flex items-center" title="edit basic info">
						{row.getValue("name")}
						<EditUser item={row.original} onUpdated={handleUpdated} />
					</div>
				);
			},
			enableHiding: false,
		},
		{
			accessorKey: "email",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="e-mail" />;
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
			cell: ({ row }) => <CellAction item={row.original as User} />,
		},
	];

	const newUser = {
		id: "",
		name: "",
		email: "",
		password: "",
		role: "user",
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

				<div className="flex items-center justify-between">
					<Heading
						title="Organization members"
						badge={filteredData.length}
						description={`Manage members in your organization.${isFiltered ? ` Showing ${filteredData.length} of ${data.length} users` : ""}`}
					/>
					<div className="flex gap-1 content-end">
						<UserFilter onFilterChange={handleFilterChange} />
						<EditUser item={newUser} onUpdated={handleCreated} isNew={true} />
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
		</>
	);
};
