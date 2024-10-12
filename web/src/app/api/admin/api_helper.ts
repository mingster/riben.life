import { auth } from "@/auth";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";

export const CheckAdminApiAccess = async () => {
  const session = (await auth()) as Session;
  const userId = session?.user.id;

  if (!session) {
    return new NextResponse("Unauthenticated", { status: 400 });
  }

  if (!userId) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  // block if not admin
  if (session.user.role !== "ADMIN") {
    return new NextResponse("Unauthenticated", { status: 402 });
  }
};
