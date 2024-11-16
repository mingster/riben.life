import fs from "node:fs";
import { NextResponse } from "next/server";
import { CheckAdminApiAccess } from "../../api_helper";

///!SECTION update default privacy md file in /public/defaults/terms.md
export async function POST(req: Request) {
  CheckAdminApiAccess();

  const body = await req.json();
  const { terms } = body;

  await fs.writeFileSync(`${process.cwd()}/public/defaults/terms.md`, terms);

  //console.log(terms);

  return NextResponse.json("ok");
}
