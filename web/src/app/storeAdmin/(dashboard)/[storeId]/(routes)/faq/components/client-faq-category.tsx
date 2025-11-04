"use client";

import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { AlertModal } from "@/components/modals/alert-modal";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import type { ColumnDef } from "@tanstack/react-table";
import { Copy, MoreHorizontal, Trash } from "lucide-react";
//import { useI18n } from "@/providers/i18n-provider";
//import { useTranslation } from "@/app/i18n/client";
//import { useRouter } from "next/navigation";
import { CheckIcon, XIcon } from "lucide-react";

import type { updateFaqSchema } from "@/actions/storeAdmin/faq/update-faq.validation";
import { toastError, toastSuccess } from "@/components/toaster";
import { DataTable } from "@/components/dataTable";
import { Button } from "@/components/ui/button";
import type { Faq } from "@/types";
import axios, { type AxiosError } from "axios";
import { useParams } from "next/navigation";
import { useState } from "react";

import type { z } from "zod";
import { EditFaq } from "./edit-faq";
import { EditFaqCategory } from "./edit-faq-category";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import logger from "@/lib/logger";

// type for FAQ category with FAQ count
export type FaqCategoryWithFaqCount = {
	id: string;
	localeId: string;
	storeId: string;
	name: string;
	sortOrder: number;
	faqCount: number;
};

interface props {
	serverData: FaqCategoryWithFaqCount[];
	faqServerData: Faq[];
}

interface CellActionProps {
	item: FaqCategoryWithFaqCount;
	onUpdated?: (newValue: FaqCategoryWithFaqCount) => void;
}

export const FaqCategoryClient: React.FC<props> = ({
	serverData,
	faqServerData,
}) => {
	const [data, setData] = useState<FaqCategoryWithFaqCount[]>(serverData);
	const [faqData, setFaqData] = useState<Faq[]>(faqServerData);

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const params = useParams();

	const newObj = {
		id: "new",
		localeId: "",
		storeId: params.storeId as string,
		name: "",
		sortOrder: serverData.length + 1,
		faqCount: 0,
	} as FaqCategoryWithFaqCount;

	/* #region maintain data array on client side */

	const handleCreated = (newVal: FaqCategoryWithFaqCount) => {
		setData((prev) => [
			...prev,
			{
				...newVal,
			},
		]);
		logger.info("handleCreated");
	};

	// Handle updated value in the data array
	const handleUpdated = (updatedVal: FaqCategoryWithFaqCount) => {
		setData((prev) =>
			prev.map((cat) => (cat.id === updatedVal.id ? updatedVal : cat)),
		);
		logger.info("handleUpdated");
	};

	const handleDeleted = (deletedVal: FaqCategoryWithFaqCount) => {
		setData((prev) => prev.filter((cat) => cat.id !== deletedVal.id));
		logger.info("handleDeleted");
	};

	const handleFaqCreated = (newFaq: Faq) => {
		//update the FAQ count of the category
		const category = data.find((cat) => cat.id === newFaq.categoryId);
		if (category) {
			//update the FAQ count of the category
			category.faqCount++;
			handleUpdated(category);
			logger.info("handleFaqCreated");
		}

		setFaqData((prev) => [
			...prev,
			{
				...newFaq,
			},
		]);
	};
	/* #endregion */

	/* #region faq_category dt */

	const columns: ColumnDef<FaqCategoryWithFaqCount>[] = [
		/*
		{
			id: "drag",
			header: () => null,
			cell: ({ row }) => <DragHandle id={row.original.id} />,
		},
		*/
		{
			accessorKey: "name",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="name" />;
			},
			cell: ({ row }) => (
				<EditFaqCategory item={row.original} onUpdated={handleUpdated} />
			),
			enableHiding: false,
		},
		{
			accessorKey: "localeId",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="locale" />;
			},
		},
		{
			accessorKey: "sortOrder",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="sort order" />;
			},
		},
		{
			accessorKey: "faqCount",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="# of FAQ" />;
			},
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					{row.getValue("faqCount")}
					<CellCreateNewFAQ item={row.original} />
				</div>
			),
		},
		{
			id: "actions",
			cell: ({ row }) => (
				<CellAction item={row.original} onUpdated={handleDeleted} />
			),
		},
	];

	const CellCreateNewFAQ: React.FC<CellActionProps> = ({ item }) => {
		const newObj = {
			id: "new",
			categoryId: item.id,
			question: "",
			answer: "",
			sortOrder: item.faqCount + 1,
			published: false,
		} as Faq;

		return <EditFaq item={newObj} onUpdated={handleFaqCreated} isNew={true} />;
	};

	const CellAction: React.FC<CellActionProps> = ({ item, onUpdated }) => {
		const [loading, setLoading] = useState(false);
		const [open, setOpen] = useState(false);

		const onConfirm = async () => {
			try {
				setLoading(true);
				await axios.delete(
					`${process.env.NEXT_PUBLIC_API_URL}/admin/faqCategory/${item.id}`,
				);
				toastSuccess({
					title: "faq category deleted",
					description: "",
				});
			} catch (error: unknown) {
				const err = error as AxiosError;
				toastError({
					title: "something wrong.",
					description: err.message,
				});
			} finally {
				setLoading(false);
				setOpen(false);

				// also update data from parent component or caller
				handleDeleted(item);
				//onUpdated?.(item);
			}
		};

		const onCopy = (id: string) => {
			navigator.clipboard.writeText(id);
			toastSuccess({
				title: "ID copied to clipboard.",
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
							<MoreHorizontal className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuItem onClick={() => onCopy(item.id)}>
							<Copy className="mr-0 size-4" /> Copy Id
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setOpen(true)}>
							<Trash className="mr-0 size-4" /> Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</>
		);
	};
	/* #endregion */

	/* #region maintain faq data array on client side */
	const handleFaqUpdated = (updatedVal: z.infer<typeof updateFaqSchema>) => {
		setFaqData((prev) =>
			prev.map((cat) => (cat.id === updatedVal.id ? updatedVal : cat)),
		);
		logger.info("handleFaqUpdated");
	};

	const handleFaqDeleted = (deletedVal: z.infer<typeof updateFaqSchema>) => {
		//remove the faq from the faqData array
		setFaqData((prev) => prev.filter((cat) => cat.id !== deletedVal.id));

		//update faq count of the category
		const category = data.find((cat) => cat.id === deletedVal.categoryId);
		if (category) {
			category.faqCount--;
			handleUpdated(category);
		}

		logger.info("handleFaqDeleted");
	};
	/* #endregion */

	/* #region faq dt */

	const columns_faq: ColumnDef<Faq>[] = [
		{
			accessorKey: "question",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="question" />;
			},
			cell: ({ row }) => (
				<div>
					{row.getValue("question")}
					<EditFaq item={row.original} onUpdated={handleFaqUpdated} />
				</div>
			),
			enableHiding: false,
		},
		{
			id: "category",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="category" />;
			},
			cell: ({ row }) => <CellCategory item={row.original} />,
		},
		{
			accessorKey: "sortOrder",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="sort order" />;
			},
		},
		{
			accessorKey: "published",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="published" />;
			},
			cell: ({ row }) => {
				const val =
					row.getValue("published") === true ? (
						<CheckIcon className="text-green-400  size-4" />
					) : (
						<XIcon className="text-red-400 size-4" />
					);

				return <div className="pl-3">{val}</div>;
			},
		},
		{
			id: "actions",
			cell: ({ row }) => (
				<CellActionFaq item={row.original} onUpdated={handleFaqDeleted} />
			),
		},
	];

	const CellCategory: React.FC<{ item: Faq }> = ({ item }) => {
		return <div>{item.FaqCategory.name}</div>;
	};

	interface FaqCellActionProps {
		item: z.infer<typeof updateFaqSchema>;
		onUpdated?: (newValue: z.infer<typeof updateFaqSchema>) => void;
	}

	const CellActionFaq: React.FC<FaqCellActionProps> = ({ item, onUpdated }) => {
		const [loading, setLoading] = useState(false);
		const [open, setOpen] = useState(false);

		const onConfirm = async () => {
			try {
				setLoading(true);
				await axios.delete(
					`${process.env.NEXT_PUBLIC_API_URL}/admin/faq/${item.id}`,
				);
				toastSuccess({
					title: "faq deleted",
					description: "",
				});
			} catch (error: unknown) {
				const err = error as AxiosError;
				toastError({
					title: "something wrong.",
					description: err.message,
				});
			} finally {
				setLoading(false);
				setOpen(false);

				// also update data from parent component or caller
				handleFaqDeleted(item);
				//onUpdated?.(item);
			}
		};

		const onCopy = (id: string) => {
			navigator.clipboard.writeText(id);
			toastSuccess({
				title: "ID copied to clipboard.",
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
							<MoreHorizontal className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuItem onClick={() => onCopy(item.id)}>
							<Copy className="mr-0 size-4" /> Copy Id
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setOpen(true)}>
							<Trash className="mr-0 size-4" /> Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</>
		);
	};
	/* #endregion */

	return (
		<>
			<div className="flex items-center justify-between">
				<Heading
					title={t("FaqCategory_Mgmt")}
					badge={data.length}
					description={t("FaqCategory_Mgmt_descr")}
				/>
				<div>
					{/*新增 */}
					<EditFaqCategory item={newObj} onUpdated={handleCreated} />
				</div>
			</div>
			{/* {JSON.stringify(data)} */}
			<DataTable
				//rowSelectionEnabled={false}
				columns={columns}
				data={data}
				//customizeColumns={false}
			/>

			<Separator />

			<div className="flex items-center justify-between">
				<Heading
					title={`${t("FAQ")}`}
					badge={faqData.length}
					description={t("FAQ_Mgmt_descr")}
				/>
			</div>
			{/* {JSON.stringify(data)} */}
			<DataTable searchKey="question" columns={columns_faq} data={faqData} />
		</>
	);
};
