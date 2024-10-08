"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import type { Category, ProductCategories } from "@prisma/client";

import { DataTableCheckbox } from "@/components/dataTable-checkbox";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import axios from "axios";
import { CheckIcon, XIcon } from "lucide-react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { t } from "i18next";

interface props {
  initialData?: ProductCategories[] | []; // persisted category relationship for this product
  allCategories: Category[]; //all available catgories in the store
  action: string;
}

// Select category(s) for this products.
//
export const ProductEditCategoryTab = ({
  initialData,
  allCategories,
  action,
}: props) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const params = useParams();
  const router = useRouter();

  const { toast } = useToast();

  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  const [loading, setLoading] = useState(false);

  const [selectedCategoryIds, setSelectedCategoryIds] =
    useState<RowSelectionState>();

  if (!mounted) return <></>;

  const formattedCategories: CategoryColumn[] = allCategories.map(
    (item: Category) => ({
      id: item.id.toString(),
      storeId: params.storeId.toString(),
      name: item.name.toString(),
      isFeatured: item.isFeatured,
      sortOrder: Number(item.sortOrder) || 0,
      //numOfProduct: item.
      //createdAt: item.createdAt,
      //updatedAt: item.updatedAt,
    }),
  );

  //console.log(`ProductEditCategoryTab: ${JSON.stringify(initialData)}`);
  /*
  const initiallySelected1: RowSelectionState = {
    "f376e45f-2374-4adf-bb01-3f3bb48259a2": false,
    "60688323-8aa0-45f8-98fb-2d4ff822bf4d": true,
    "e2a53c05-ad5c-46cc-926b-00982ce24a60": true,
  };
  */

  // construct pre-select rows from ProductCategories
  //
  // biome-ignore lint/style/noVar: <explanation>
  var initiallySelected: RowSelectionState = {};
  if (initialData) {
    // use index number as row key
    initialData.map((pc: ProductCategories, index2) => {
      allCategories.map((item: Category, index) => {
        //console.log(`checked: ${index} - ${item.id}-${pc.categoryId === item.id}`,);

        if (pc.categoryId === item.id) {
          initiallySelected[index] = true;
        }
      });
    });
  }

  // persist check/uncheck status to database
  //
  const saveData = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    // selectedCategoryIds = RowSelectionState = Record<string, boolean>
    if (!selectedCategoryIds) return;

    //console.log(selectedCategoryIds);

    // remove all categories associated with the product
    await axios.delete(
      `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/product/${params.productId}/category`,
      { data: {} },
    );

    allCategories.map(async (item: Category, index) => {
      //const selected = selectedCategoryIds[item.id.toString()];
      const selected = selectedCategoryIds[index];

      //console.log(`allCategories: ${item.id.toString()} : ${selected}`);
      if (selected) {
        // save to db
        const obj = {
          productId: params.productId.toString(),
          categoryId: item.id.toString(),
          sortOrder: index + 1,
        };
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/product/${params.productId}/category`,
          obj,
        );

        //console.log(`save to db: ${item.id.toString()}`);
      } else {
        // remove from db
        /*
        await axios.delete(
          `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/product/${params.productId}/category`,
          { data: { categoryId: item.id.toString() } },
        );
        console.log(`remove from db: ${item.id.toString()}`);
        */
      }
    });

    router.refresh();

    toast({
      title: t("Product_category") + t("Updated"),
      description: "",
      variant: "success",
    });
  };

  return (
    <>
      <Card>
        <CardHeader> </CardHeader>
        <CardContent className="space-y-2">
          {/* display */}
          <div className="w-full">
            <DataTableCheckbox
              disabled={loading}
              noSearch={true}
              columns={columns}
              data={formattedCategories}
              initiallySelected={initiallySelected}
              onRowSelectionChange={setSelectedCategoryIds}
            />
          </div>
          <Button
            type="button"
            disabled={loading}
            className="disabled:opacity-25"
            onClick={saveData}
          >
            {t("Add")}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              router.push(`/storeAdmin/${params.storeId}/products`);
            }}
            className="ml-5"
          >
            {t("Cancel")}
          </Button>
        </CardContent>
      </Card>
    </>
  );
};

type CategoryColumn = {
  id: string;
  storeId: string;
  name: string;
  isFeatured: boolean;
  sortOrder: number;
  numOfProduct?: number;
  //createdAt: Date;
  //updatedAt: Date;
};

const columns: ColumnDef<CategoryColumn>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader column={column} title={t("Product_category")} />
      );
    },
  },
  {
    accessorKey: "isFeatured",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader
          column={column}
          title={t("Product_category_isFeatured")}
        />
      );
    },
    cell: ({ row }) => {
      //console.log( typeof(row.getValue("isFeatured")) );
      const isFeatured =
        row.getValue("isFeatured") === true ? (
          <CheckIcon className="text-green-400  h-4 w-4" />
        ) : (
          <XIcon className="text-red-400 h-4 w-4" />
        );
      return <div className="pl-3">{isFeatured}</div>;
    },
  },
  /*
  {
    accessorKey: "id",
  },*/
];
