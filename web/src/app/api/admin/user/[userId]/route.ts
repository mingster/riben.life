import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";

import { CheckAdminApiAccess } from "../../api_helper";

///!SECTION update user in database.
export async function PATCH(
  req: Request,
  props: { params: Promise<{ userId: string }> },
) {
  const params = await props.params;
  try {
    CheckAdminApiAccess();

    if (!params.userId) {
      return new NextResponse("user id is required", { status: 400 });
    }

    const body = await req.json();
    const obj = await sqlClient.user.update({
      where: {
        id: params.userId,
      },
      data: { ...body, updatedAt: new Date(Date.now()) },
    });

    console.log(`updated user: ${JSON.stringify(obj)}`);

    return NextResponse.json(obj);
  } catch (error) {
    console.log("[USER_PATCH]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
