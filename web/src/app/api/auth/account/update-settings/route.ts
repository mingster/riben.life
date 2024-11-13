import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import type { Session } from "next-auth";
import { getUtcDate } from "@/lib/utils";

///!SECTION update user data on user's own behave.
export async function PATCH(req: Request) {
  try {
    const session = (await auth()) as Session;
    const userId = session?.user.id;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const body = await req.json();
    const obj = await sqlClient.user.update({
      where: {
        id: userId,
      },
      data: { ...body, updatedAt: getUtcDate() },
    });
    revalidatePath("/");
    //console.log(`updated user: ${JSON.stringify(obj)}`);

    return NextResponse.json(obj);
  } catch (error) {
    console.log("[USER_PATCH]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}
