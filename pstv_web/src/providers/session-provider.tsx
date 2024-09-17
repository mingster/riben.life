"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

export default function SessionWrapper({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session;
}): React.ReactNode {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
