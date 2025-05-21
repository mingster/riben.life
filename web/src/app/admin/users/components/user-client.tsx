"use client";

import { DataTableDraggable } from "@/components/datatable-draggable";
import { Separator } from "@/components/ui/separator";

import { Heading } from "@/components/ui/heading";
import { columns } from "./columns";
import type { User } from "@/types";

interface UsersClientProps {
	data: User[];
}

export const UsersClient: React.FC<UsersClientProps> = ({ data }) => {
	return (
		<>
			<div className="flex items-center justify-between">
				<Heading
					title="Users"
					badge={data.length}
					description="Manage Users in this system."
				/>
			</div>
			<Separator />
			<DataTableDraggable
				rowSelectionEnabled={false}
				columns={columns}
				data={data.map((user) => ({
					id: user.id,
					name: user.name ?? "",
					locale: user.locale ?? "",
					role: user.role ?? "",
				}))}
			/>
		</>
	);
};
