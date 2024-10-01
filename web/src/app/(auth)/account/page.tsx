//import { auth } from "@/auth";

import getUser from "@/actions/get-user";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import type { User } from "@/types";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountTabs } from "./components/tabs";
import { Navbar } from "@/components/global-navbar";

export const metadata: Metadata = {
  title: "My Account",
};

export default async function AccountPage() {
  const user = (await getUser()) as User;

  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_API_URL}/auth/signin`);
  } else {
    //console.log(`user: ${JSON.stringify(u)}`);

    return (
      <Suspense fallback={<Loader />}>
        <Container>
          <AccountTabs user={user} />
        </Container>
      </Suspense>
    );
  }
}
