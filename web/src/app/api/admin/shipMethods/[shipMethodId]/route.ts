import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckAdminApiAccess } from "../../api_helper";


export async function PATCH(
  req: Request,
  { params }: { params: { shipMethodId: string } },
) {
  try {
    CheckAdminApiAccess();

    const body = await req.json();

    const obj = await sqlClient.shippingMethod.update({
      where: {
        id: params.shipMethodId,
      },
      data: {
        ...body,
        updatedAt: new Date(Date.now()),
      },
    });

    return NextResponse.json(obj);
  } catch (error) {
    console.log("[PATCH]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
