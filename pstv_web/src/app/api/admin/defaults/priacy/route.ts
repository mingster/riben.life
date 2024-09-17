import { authOptions } from "@/auth";
import { sqlClient } from "@/lib/prismadb";
import { type Session, getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import fs from "node:fs";

///!SECTION update default privacy md file in /public/defaults/privacy.md
export async function POST(req: Request) {
  const body = await req.json();
  const { privacyPolicy } = body;

  await fs.writeFileSync(
    `${process.cwd()}/public/defaults/privacy.md`,
    privacyPolicy,
  );

  //console.log(privacyPolicy);

  return NextResponse.json("ok");
}
