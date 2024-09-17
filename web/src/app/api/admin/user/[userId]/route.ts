import { authOptions } from "@/auth";
import { sqlClient } from "@/lib/prismadb";
import { type Session, getServerSession } from "next-auth";
import { NextResponse } from "next/server";

///!SECTION update user in database.
export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } },
) {
  try {
    const session = (await getServerSession(authOptions)) as Session;
    const userId = session?.user.id;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

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
