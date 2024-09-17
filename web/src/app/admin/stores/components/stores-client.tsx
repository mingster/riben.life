"use client";

import { DataTable } from "@/components/dataTable";
import { Separator } from "@/components/ui/separator";

import { Heading } from "@/components/ui/heading";
import { type StoreColumn, columns } from "./columns";

interface props {
  data: StoreColumn[];
}

export const StoresClient: React.FC<props> = ({ data }) => {
  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Stores (${data.length})`}
          description="Manage stores in this system."
        />
      </div>
      <Separator />
      <DataTable searchKey="customDomain" columns={columns} data={data} />
    </>
  );
};
