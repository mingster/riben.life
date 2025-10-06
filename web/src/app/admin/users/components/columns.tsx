"use client";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";

import { DragHandle } from "@/components/datatable-draggable";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckIcon, XIcon } from "lucide-react";
import { CellAction } from "./cell-action";

import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";

import { toastError, toastSuccess } from "@/components/Toaster";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useTranslation } from "@/app/i18n/client";
import { LocaleSelectItems } from "@/components/locale-select-items";

import type { z } from "zod";

import { updateUserSettingsAction } from "@/actions/admin/user/update-user-settings";
import {
	type UpdateUserSettingsInput,
	updateUserSettingsSchema,
} from "@/actions/admin/user/update-user-settings.validation";
import type { User } from "@/types";
import { formatDateTime } from "@/utils/datetime-utils";
import { UserRoleCombobox } from "./user-role-combobox";

/*
export type UserColumn = {
	id: string;
	name: string;
	username: string;
	email: string;
	role: string;
	createdAt: string;
	currentlySignedIn: boolean;
};
*/
type formValues = z.infer<typeof updateUserSettingsSchema>;

function TableCellEditor({
	item,
}: { item: z.infer<typeof updateUserSettingsSchema> }) {
	const isMobile = useIsMobile();
	const [loading, setLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);

	const { i18n } = useTranslation();
	const [activeLng, setActiveLng] = useState(i18n.language);
	const { t } = useTranslation(activeLng);

	async function onSubmit(data: UpdateUserSettingsInput) {
		setLoading(true);
		const result = await updateUserSettingsAction(data);
		if (result?.serverError) {
			toastError({ description: result.serverError });
		} else {
			toastSuccess({ description: "Profile updated." });
			handleChangeLanguage(data.locale);
		}
		setLoading(false);
		setIsOpen(false);
	}

	const handleChangeLanguage = (lng: string) => {
		i18n.changeLanguage(lng);
		setActiveLng(lng);
		//cookies.set(cookieName, lng, { path: "/" });
		console.log("activeLng set to: ", lng);
	};

	const defaultValues = item
		? {
				...item,
			}
		: {};

	const form = useForm<UpdateUserSettingsInput>({
		resolver: zodResolver(updateUserSettingsSchema),
		defaultValues,
		mode: "onChange",
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = useForm<formValues>();

	//console.log('disabled', loading || form.formState.isSubmitting);

	return (
		<>
			<Drawer
				direction={isMobile ? "bottom" : "right"}
				open={isOpen}
				onOpenChange={setIsOpen}
			>
				<DrawerTrigger asChild>
					<Button
						variant="link"
						className="text-foreground w-fit px-0 text-left"
						onClick={() => setIsOpen(true)}
					>
						{item.name}
					</Button>
				</DrawerTrigger>

				<DrawerContent>
					<DrawerHeader className="gap-1">
						<DrawerTitle>{item.name}</DrawerTitle>
						<DrawerDescription>Edit User</DrawerDescription>
					</DrawerHeader>

					<div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								className="max-w-sm space-y-2.5"
							>
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Name</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													placeholder="Enter your name"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="locale"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("account_tabs_language")}</FormLabel>
											<FormControl>
												<Select
													disabled={loading || form.formState.isSubmitting}
													onValueChange={field.onChange}
													defaultValue={field.value}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select a default locale" />
													</SelectTrigger>
													<SelectContent>
														<LocaleSelectItems />
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="role"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Role</FormLabel>
											<FormControl>
												<UserRoleCombobox
													defaultValue={field.value}
													onChange={field.onChange}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<Button
									type="submit"
									disabled={loading || form.formState.isSubmitting}
									className="disabled:opacity-25"
								>
									{t("Submit")}
								</Button>
							</form>
						</Form>
					</div>
				</DrawerContent>
			</Drawer>
		</>
	);
}

export const columns: ColumnDef<z.infer<typeof updateUserSettingsSchema>>[] = [
	{
		id: "drag",
		header: () => null,
		cell: ({ row }) => <DragHandle id={row.original.id} />,
	},
	{
		accessorKey: "name",
		header: "Name",
		cell: ({ row }) => {
			return <TableCellEditor item={row.original} />;
		},
		enableHiding: false,
	},
	/*
		{
			accessorKey: "name1",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="Name" />;
			},
			cell: ({ row }) => (
				<Link
					className="pl-5"
					title="view and reply the ticket"
					href={`./users/${row.original.id}/`}
				>
					{row.getValue("name")}
				</Link>
			),
		},
	*/

	{
		accessorKey: "email",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="E-mail" />;
		},
	},
	{
		accessorKey: "role",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="Role" />;
		},
	},
	{
		accessorKey: "createdAt",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="Member since" />;
		},
		cell: ({ row }) => {
			return (
				<div className="pl-3">{formatDateTime(row.getValue("createdAt"))}</div>
			);
		},
	},
	{
		accessorKey: "currentlySignedIn",
		header: ({ column }) => {
			return <DataTableColumnHeader column={column} title="Signed In?" />;
		},
		cell: ({ row }) => {
			//console.log( typeof(row.getValue("isRecurring")) );
			const currentlySignedIn =
				row.getValue("currentlySignedIn") === true ? (
					<CheckIcon className="text-green-400  size-4" />
				) : (
					<XIcon className="text-red-400 size-4" />
				);

			return <div className="pl-3">{currentlySignedIn}</div>;
		},
	},
	{
		id: "actions",
		cell: ({ row }) => <CellAction data={row.original as User} />,
	},
];
