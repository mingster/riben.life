"use client";

import { DataTable } from "@/components/dataTable";
import { Separator } from "@/components/ui/separator";

import { Heading } from "@/components/ui/heading";
import { type UserColumn, columns } from "./columns";

interface UsersClientProps {
  data: UserColumn[];
}

export const UsersClient: React.FC<UsersClientProps> = ({ data }) => {
  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Users (${data.length})`}
          description="Manage Users in this system."
        />
      </div>
      <Separator />
      <DataTable searchKey="name" columns={columns} data={data} />
    </>
  );
};
