"use client";

import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	type OnChangeFn,
	type RowSelectionState,
	useReactTable,
} from "@tanstack/react-table";
import { useEffect, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/providers/i18n-provider";

interface props<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	noSearch?: boolean;
	searchKey?: string;
	// pre-selected rows in RowSelectionState object. e.g. {0: true, 1: false, 2: true,}
	initiallySelected: RowSelectionState;
	disabled: boolean;
	// return
	onRowSelectionChange?: (rows: RowSelectionState) => void;
}

// DataTableCheckbox is a table with checkbox for each row.
// It is used to select rows and perform actions on them.
// initiallySelected is used to pre-select rows.
// onRowSelectionChange is used to handle the selection change.
// noSearch is used to disable the search input.
// searchKey is used to search the table.
// disabled is used to disable the checkbox and the table.
// onRowSelectionChange is used to handle the selection change.
//
export function DataTableCheckbox<TData, TValue>({
	columns,
	data,
	noSearch,
	searchKey,
	initiallySelected,
	disabled,
	onRowSelectionChange,
}: props<TData, TValue>) {
	//const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	//const [sorting, setSorting] = useState<SortingState>([]);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// pre-select rows
	const [rowSelection, setRowSelection] =
		useState<RowSelectionState>(initiallySelected);

	//console.log(rowSelection);

	const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (state) => {
		setRowSelection(state);
		//console.log(rowSelection);
	};

	useEffect(() => {
		//RowSelectionState = Record<string, boolean>
		onRowSelectionChange?.(rowSelection);
	}, [rowSelection, onRowSelectionChange]);

	const [pagination, setPagination] = useState({
		pageIndex: 0, //initial page index
		pageSize: 10, //default page size
	});

	const table = useReactTable({
		data,
		columns,
		//override the row.id with the databaseId
		//getRowId: (originalRow) => originalRow.id.toString(),

		onRowSelectionChange: handleRowSelectionChange,
		//onRowSelectionChange: setRowSelection,
		enableRowSelection: !disabled,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onPaginationChange: setPagination, //update the pagination state when internal APIs mutate the pagination state
		state: {
			//sorting,
			//columnFilters,
			pagination,
			rowSelection,
		},
		//onSortingChange: setSorting,
		//getSortedRowModel: getSortedRowModel(),
		//onColumnFiltersChange: setColumnFilters,
		//getFilteredRowModel: getFilteredRowModel(),
	});

	// make optional params not null and give it a default value
	noSearch = noSearch || false;
	searchKey = searchKey || "";

	const s = `${t("search")} ${searchKey}`;

	return (
		<div>
			{!noSearch && searchKey && (
				<div className="flex items-center py-4">
					<Input
						placeholder={s}
						value={
							(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
						}
						onChange={(event) =>
							table.getColumn(searchKey)?.setFilterValue(event.target.value)
						}
						disabled={disabled}
						className="max-w-sm"
					/>
				</div>
			)}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead
											key={header.id}
											className={header.id === "select" ? "pl-5" : ""}
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
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id} className="pl-5">
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
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

			<div className="flex items-center justify-end space-x-2 py-4">
				<div className="flex-1 text-sm text-muted-foreground">
					{`${table.getFilteredSelectedRowModel().rows.length} of ${table.getFilteredRowModel().rows.length} ${t("item")}${t("selected")}`}
				</div>

				<div className="space-x-2">
					{table.getCanPreviousPage() && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							{t("previous")}
						</Button>
					)}
					{table.getCanNextPage() && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							{t("next")}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
