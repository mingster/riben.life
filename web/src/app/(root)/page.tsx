"use client";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
//import { toast } from "react-hot-toast";
import { useToast } from "@/components/ui/use-toast";

import { Loader } from "@/components/ui/loader";
import { getHostname } from "@/lib/utils";
import type { Store } from "@prisma/client";

// ANCHOR check custom domains. if found, redirect to the store.
// if not found, display default page (at )
//
//export default async function Page({ host }: { host: string }) {
export default function GlobalHomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const router = useRouter();
  const { toast } = useToast();

  const { lng } = useI18n();
  const { t } = useTranslation(lng);

  const routeToStore = async () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/store/get-by-hostname`;
    const body = JSON.stringify({
      customDomain: getHostname(),
    });

    //console.log(JSON.stringify(body));
    //console.log('url: ' + getHostname());

    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    })
      .then((response) => response.json())
      .then((data) => {
        //console.log(data.length===0);
        //console.log('featch result: ' + JSON.stringify(data));
        let url = "/unv"; // the default built-in path if no store found

        if (data.length !== 0) {
          //if pending order, move on to payment
          const stores = data as Store[];
          //console.log('featch result: ' + JSON.stringify(stores));
          //console.log('store.id: ' + stores[0].id);

          const storeId = stores[0].id;
          if (storeId) {
            url = `./${storeId}`;
          }
        }

        router.push(url);
      })
      .catch((error) => {
        console.error(error);
        toast({
          title: "Something went wrong.",
          description: error.message,
          variant: "destructive",
        });
      });
  };

  if (!mounted) return <></>;

  routeToStore();

  return <Loader />;
}
