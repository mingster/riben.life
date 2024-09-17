import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import { NextResponse } from "next/server";

// Called by StoreSwitcher to obtain user's store(s)
//
export async function GET(
  req: Request,
  { params }: { params: { ownerId: string } },
) {
  if (!params.ownerId) {
    return new NextResponse("User is required", { status: 401 });
  }
  //const body = await req.json();

  //const { ownerId } = body;

  if (!params.ownerId) {
    return new NextResponse("Unauthenticated", { status: 403 });
  }

  const stores = await sqlClient.store.findMany({
    where: {
      ownerId: params.ownerId,
      isDeleted: false,
    },
  });

  transformDecimalsToNumbers(stores);

  //console.log('stores: ' + JSON.stringify(stores));

  return NextResponse.json(stores);
}
