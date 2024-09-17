import { authOptions } from "@/auth";
import { sqlClient } from "@/lib/prismadb";
import { type Session, getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import fs from "node:fs";

///!SECTION update default privacy md file in /public/defaults/terms.md
export async function POST(req: Request) {
  const body = await req.json();
  const { terms } = body;

  await fs.writeFileSync(`${process.cwd()}/public/defaults/terms.md`, terms);

  //console.log(terms);

  return NextResponse.json("ok");
}
