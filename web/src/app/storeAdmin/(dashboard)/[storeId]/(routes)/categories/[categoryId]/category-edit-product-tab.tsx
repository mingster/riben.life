"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import type { Product, ProductCategories } from "@prisma/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DataTableCheckbox } from "@/components/dataTable-checkbox";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import axios from "axios";
import { CheckIcon, XIcon } from "lucide-react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { t } from "i18next";

import Currency from "@/components/currency";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { ProductStatuses } from "@/types/enum";
import Link from "next/link";

interface props {
  storeId: string;
  initialData?: ProductCategories[] | []; // persisted data from database
  allProducts: Product[]; //all available products in the store
}

// Select products for this store category.
//
export const CategoryEditProductTab = ({
  storeId,
  initialData,
  allProducts,
}: props) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const params = useParams();
  const router = useRouter();
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  const { toast } = useToast();

  const [loading, setLoading] = useState(false);

  const [selectedProductIds, setSelectedProductIds] =
    useState<RowSelectionState>();

  if (!mounted) return <></>;

  const formattedProducts: ProductColumn[] = allProducts.map(
    (item: Product) => ({
      id: item.id.toString(),
      storeId: storeId,
      name: item.name.toString(),
      price: Number(item.price),
      status: item.status,
      isFeatured: item.isFeatured,
      //createdAt: item.createdAt,
      updatedAt: formatDateTime(item.updatedAt),
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
  const initiallySelected: RowSelectionState = {};
  if (initialData) {
    // use index number as row key
    initialData.map((pc: ProductCategories, index2) => {
      allProducts.map((item: Product, index) => {
        //console.log(`checked: ${index} - ${item.id}-${pc.categoryId === item.id}`,);
        if (pc.productId === item.id) {
          initiallySelected[index] = true;
        }
      });
    });

    /* use id as key
    for (let i = 0; i < allCategories.length; i++) {
      for (let j = 0; j <= initialData.length; j++) {
        if (initialData[j].categoryId === allCategories[i].id) {
          initiallySelected[i] = true;
        }
        else {
          initiallySelected[i] = false;
        }
      }
    }


    for (let i = 0; i < initialData.length; i++) {
      initiallySelected[initialData[i].categoryId.toString()] = true;
    }
    */
  }
  //console.log("initiallySelected");
  //console.log(initiallySelected);

  // persist check/uncheck status to database
  //
  const saveData = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    // selectedProductIds = RowSelectionState = Record<string, boolean>
    if (!selectedProductIds) return;

    //console.log(selectedProductIds);

    // remove all products associated with this category
    await axios.delete(
      `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId?.toString()}/categories/${params.categoryId?.toString()}/product`,
      { data: {} },
    );

    allProducts.map(async (item: Product, index) => {
      //const selected = selectedCategoryIds[item.id.toString()];
      const selected = selectedProductIds[index];

      //console.log(`allCategories: ${item.id.toString()} : ${selected}`);
      if (selected) {
        // save to db
        const obj = {
          productId: item.id.toString(),
          categoryId: params.categoryId?.toString(),
          sortOrder: index + 1,
        };
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId?.toString()}/categories/${params.categoryId?.toString()}/product`,
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

    toast({
      title: t("Category") + t("Added"),
      description: "",
      variant: "success",
    });

    router.refresh();
    router.push(`/storeAdmin/${params.storeId?.toString()}/categories`);
  };

  return (
    <>
      {/* display */}
      <Card className="w-full">
        <CardContent className="space-y-2">
          <DataTableCheckbox
            disabled={loading}
            searchKey="name"
            columns={columns}
            data={formattedProducts}
            initiallySelected={initiallySelected}
            onRowSelectionChange={setSelectedProductIds}
          />
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
              router.push(
                `/storeAdmin/${params.storeId?.toString()}/categories`,
              );
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

type ProductColumn = {
  id: string; // CANNOT rename, because we hard code the name in DataTableCheckbox.
  storeId: string;
  name: string;
  price: number;
  isFeatured: boolean;
  status: number;
  //isRecurring: boolean | undefined;
  //stock: number | undefined;
  updatedAt: string;
};

const columns: ColumnDef<ProductColumn>[] = [
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
        <DataTableColumnHeader column={column} title={t("Product_name")} />
      );
    },
    cell: ({ row }) => (
      <Link
        className="pl-0"
        title="click to edit"
        href={`../products/${row.original.id}`}
      >
        {row.getValue("name")}
      </Link>
    ),
  },
  {
    accessorKey: "price",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader column={column} title={t("Product_price")} />
      );
    },
    cell: ({ row }) => {
      const price = Number(row.getValue("price"));

      return (
        <>
          <div className="">
            <Currency value={price} />
          </div>
        </>
      );
    },
  },
  {
    accessorKey: "isFeatured",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader column={column} title={t("Product_featured")} />
      );
    },
    cell: ({ row }) => {
      const val =
        row.getValue("isFeatured") === true ? (
          <CheckIcon className="text-green-400  size-4" />
        ) : (
          <XIcon className="text-red-400 size-4" />
        );

      return <div className="pl-3">{val}</div>;
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <DataTableColumnHeader column={column} title={t("Product_status")} />
      );
    },
    cell: ({ row }) => {
      const status = ProductStatuses[Number(row.getValue("status"))];

      return <div>{t(`ProductStatus_${status.label}`)}</div>;
    },
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title={t("updated")} />;
    },
  },
  /*
  {
    accessorKey: "id",
  },*/
];
