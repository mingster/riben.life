import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import { NextResponse } from "next/server";

// returns store by its custom domain name
//
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customDomain } = body;

    if (!customDomain) {
      return new NextResponse("customDomain is required", { status: 400 });
    }

    const store = await sqlClient.store.findMany({
      where: { customDomain: customDomain },
    });

    transformDecimalsToNumbers(store);

    return NextResponse.json(store);
  } catch (error) {
    console.log("[GET_BY_HOSTNAME]", error);

    return new NextResponse("Internal error", { status: 500 });
  }
}
