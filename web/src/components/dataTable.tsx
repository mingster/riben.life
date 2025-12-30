"use client";

import {
	type ColumnDef,
	type ColumnFiltersState,
	type SortingState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	noSearch?: boolean;
	searchKey?: string;
	noPagination?: boolean; // default is true
	defaultPageSize?: number; // default is 30 when pagination enabled
}

export function DataTable<TData, TValue>({
	columns,
	data,
	noSearch = true,
	searchKey,
	noPagination = false,
	defaultPageSize = 30,
}: DataTableProps<TData, TValue>) {
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [sorting, setSorting] = useState<SortingState>([]);
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [pagination, setPagination] = useState({
		pageIndex: 0, //initial page index
		pageSize: noPagination ? data.length : defaultPageSize, //default page size
	});

	useEffect(() => {
		if (noPagination) {
			setPagination((prev) => ({
				...prev,
				pageIndex: 0,
				pageSize: data.length || prev.pageSize,
			}));
		}
	}, [noPagination, data.length]);

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onPaginationChange: setPagination, //update the pagination state when internal APIs mutate the pagination state
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		state: {
			sorting,
			columnFilters,
			pagination,
		},
	});

	// make optional params not null and give it a default value
	//noSearch = noSearch || false;
	searchKey = searchKey || "";

	const s = `${t("search")} ${searchKey}`;

	return (
		<div>
			{!noSearch && searchKey && (
				<div className="flex items-center py-3 sm:py-4">
					<Input
						placeholder={s}
						value={
							(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
						}
						onChange={(event) =>
							table.getColumn(searchKey)?.setFilterValue(event.target.value)
						}
						className="max-w-full sm:max-w-sm h-10 text-base sm:h-9 sm:text-sm"
					/>
				</div>
			)}
			<div className="rounded-md border overflow-hidden">
				<div className="overflow-x-auto -mx-3 sm:mx-0">
					<Table className="min-w-full">
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => {
										const columnMeta = header.column.columnDef.meta as
											| { className?: string }
											| undefined;
										return (
											<TableHead
												key={header.id}
												className={cn("p-0", columnMeta?.className)}
											>
												{header.isPlaceholder
													? null
													: flexRender(
															header.column.columnDef.header,
															header.getContext(),
														)}
											</TableHead>
										);
									})}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map((row) => (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && "selected"}
									>
										{row.getVisibleCells().map((cell) => {
											const columnMeta = cell.column.columnDef.meta as
												| { className?: string }
												| undefined;
											return (
												<TableCell
													key={cell.id}
													className={cn(
														"pl-2 sm:pl-3 py-2 sm:py-3",
														columnMeta?.className,
													)}
												>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext(),
													)}
												</TableCell>
											);
										})}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="h-24 text-center"
									>
										{t("no_result")}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			</div>
			{!noPagination && table.getPageCount() > 1 && (
				<div className="flex items-center justify-end gap-1.5 sm:gap-2 py-3 sm:py-4">
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						className="h-10 sm:h-8"
					>
						<span className="text-sm sm:text-xs">{t("previous")}</span>
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						className="h-10 sm:h-8"
					>
						<span className="text-sm sm:text-xs">{t("next")}</span>
					</Button>
				</div>
			)}
		</div>
	);
}
