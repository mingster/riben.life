"use client";

import { DataTable } from "@/components/dataTable";
import { Separator } from "@/components/ui/separator";

import { Heading } from "@/components/ui/heading";
import { type DataColumn, columns } from "./columns";

interface props {
	data: DataColumn[];
}

export const DataClient: React.FC<props> = ({ data }) => {
	return (
		<>
			<div className="flex items-center justify-between">
				<Heading
					title="Payment Methods"
					badge={data.length}
					description="Manage pay methods in this system."
				/>
			</div>
			<Separator />
			<DataTable searchKey="name" columns={columns} data={data} />
		</>
	);
};
