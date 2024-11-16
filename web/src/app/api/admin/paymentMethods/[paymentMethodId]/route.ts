import { sqlClient } from "@/lib/prismadb";
import { getNowTimeInTz, getUtcNow } from "@/lib/utils";
import { NextResponse } from "next/server";
import { CheckAdminApiAccess } from "../../api_helper";

export async function PATCH(
  req: Request,
  props: { params: Promise<{ paymentMethodId: string }> },
) {
  const params = await props.params;
  try {
    CheckAdminApiAccess();

    const body = await req.json();

    const obj = await sqlClient.paymentMethod.update({
      where: {
        id: params.paymentMethodId,
      },
      data: {
        ...body,
        updatedAt: getUtcNow(),
      },
    });
    return NextResponse.json(obj);
  } catch (error) {
    console.log("[PATCH]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
