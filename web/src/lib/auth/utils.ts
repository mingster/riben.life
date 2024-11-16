import { auth } from "@/auth";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

// put all auth related functions here so we don't import auth shit everywhere

export async function GetSession() {
  const session = (await auth()) as Session;
  if (!session) {
    return null;
  }

  return session;
}

// if not signed in, redirect to sign in page
export async function RequiresSignIn() {
  const session = (await auth()) as Session;

  if (!session) {
    if (!session) {
      redirect(`${process.env.NEXT_PUBLIC_API_URL}/auth/signin`);
    }
  }
}

// if not signed in, Response a 400 error
export async function IsSignInResponse() {
  const session = await GetSession();

  if (!session) {
    // Handle the case where there's no session, e.g., redirect to login
    return null;
  }

  const userId = session?.user.id;
  if (!userId) {
    return new NextResponse("Unauthenticated", { status: 400 });
  }

  return userId;
}
