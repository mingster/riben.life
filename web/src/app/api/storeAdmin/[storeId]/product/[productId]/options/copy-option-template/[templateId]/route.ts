import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { transformDecimalsToNumbers } from "@/lib/utils";
import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import type {
  StoreProductOptionSelectionsTemplate,
  StoreProductOptionTemplate,
} from "@prisma/client";

///!SECTION copy product option and its selections from store template.
// It's useful when creating many similar products.
// called by: DisplayStoreOptionTemplates.
export async function POST(
  req: Request,
  {
    params,
  }: { params: { storeId: string; productId: string; templateId: string } },
) {
  try {
    CheckStoreAdminApiAccess(params.storeId);

    if (!params.storeId) {
      return new NextResponse("store id is required", { status: 410 });
    }

    if (!params.productId) {
      return new NextResponse("product id is required", { status: 411 });
    }

    if (!params.templateId) {
      return new NextResponse("template id is required", { status: 412 });
    }

    // those data are the value from store template
    const sptemplate = (await sqlClient.storeProductOptionTemplate.findUnique({
      where: {
        id: params.templateId,
      },
    })) as StoreProductOptionTemplate;

    if (!sptemplate) {
      // handle the case where no record is found
      return new NextResponse("template not found", { status: 404 });
    }
    // 1. create product option from template
    const productOption = await sqlClient.productOption.upsert({
      create: {
        productId: params.productId,
        optionName: sptemplate.optionName,
        isRequired: sptemplate.isRequired,
        isMultiple: sptemplate.isMultiple,
        minSelection: sptemplate.minSelection,
        maxSelection: sptemplate.maxSelection,
        allowQuantity: sptemplate.allowQuantity,
        minQuantity: sptemplate.minQuantity,
        maxQuantity: sptemplate.maxQuantity,
        sortOrder: sptemplate.sortOrder,
      },
      update: {
        optionName: sptemplate.optionName,
        isRequired: sptemplate.isRequired,
        isMultiple: sptemplate.isMultiple,
        minSelection: sptemplate.minSelection,
        maxSelection: sptemplate.maxSelection,
        allowQuantity: sptemplate.allowQuantity,
        minQuantity: sptemplate.minQuantity,
        maxQuantity: sptemplate.maxQuantity,
        sortOrder: sptemplate.sortOrder,
      },
      where: {
        productId_optionName: {
          productId: params.storeId,
          optionName: sptemplate.optionName,
        },
      },
    });

    if (!productOption) {
      return new NextResponse("product option did not created", {
        status: 405,
      });
    }

    // 2. create product selection from template
    const templateSelection =
      (await sqlClient.storeProductOptionSelectionsTemplate.findMany({
        where: {
          optionId: sptemplate.id,
        },
      })) as StoreProductOptionSelectionsTemplate[];

    for (let i = 0; i < templateSelection.length; i++) {
      const name = templateSelection[i].name;
      const price = templateSelection[i].price;
      const isDefault = templateSelection[i].isDefault;

      await sqlClient.productOptionSelections.create({
        data: {
          optionId: productOption.id,
          name,
          price,
          isDefault,
        },
      });
    }

    const result = await sqlClient.productOption.findUnique({
      where: {
        id: productOption.id,
      },
      include: {
        ProductOptionSelections: true,
      },
    });

    //console.log("result", JSON.stringify(result));

    transformDecimalsToNumbers(result);

    return NextResponse.json(result);
  } catch (error) {
    console.log("[PRODUCTOPTION_POST]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
