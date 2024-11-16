"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { slideIn } from "@/lib/motion";
import type { StoreSettings } from "@prisma-mongo/prisma/client";
import { motion } from "framer-motion";
import { BellIcon, FacebookIcon, InstagramIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { Store } from "prisma/prisma-client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

export interface props {
  store: Store;
  storeSettings: StoreSettings;
}

export const StoreContactCard: React.FC<props> = ({ store, storeSettings }) => {
  //const router = useRouter();
  //const session = useSession();
  //const user = session.data?.user;
  const { lng } = useI18n();
  const { t } = useTranslation(lng);

  //supports-[backdrop-filter]:bg-background/60
  return (
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      //className="w-full relative z-0"
    >
      <motion.div variants={slideIn("left", "tween", 0.2, 1)}>
        <Card className="">
          <CardHeader>
            <CardTitle>{t("nav_contact")}</CardTitle>
            <CardDescription />
          </CardHeader>
          <CardContent className="grid gap-2">
            <div className="flex items-center space-x-4 rounded-md border p-2">
              <BellIcon />
              <div className="flex-1 space-y-1">
                {storeSettings.aboutUs && (
                  <div className="text-sm font-medium leading-none">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: storeSettings.aboutUs,
                      }}
                    />
                  </div>
                )}
                {storeSettings.supportPhoneNumber && (
                  <div className="text-sm text-muted-foreground">
                    {storeSettings.supportPhoneNumber}
                  </div>
                )}
              </div>
            </div>

            <div className="">
              {storeSettings.facebookUrl && (
                <div className="text-sm pb-2 flex">
                  <FacebookIcon className="size-4" />
                  <Link className="pl-1" href={storeSettings.facebookUrl}>
                    Facebook
                  </Link>
                </div>
              )}
              {storeSettings.igUrl && (
                <div className="text-sm pb-2 flex">
                  <InstagramIcon className="size-4" />
                  <Link className="pl-1" href={storeSettings.igUrl}>
                    IG
                  </Link>
                </div>
              )}
              {storeSettings.lineId && (
                <div className="text-sm pb-2 text-muted-foreground">
                  Line Id: {storeSettings.lineId}
                </div>
              )}

              {storeSettings.telegramId && (
                <div className="text-sm pb-2 text-muted-foreground">
                  telegram: {storeSettings.telegramId}
                </div>
              )}

              {storeSettings.twitterId && (
                <div className="text-sm pb-2 text-muted-foreground">
                  twitter: {storeSettings.twitterId}
                </div>
              )}

              {storeSettings.whatsappId && (
                <div className="text-sm pb-2 text-muted-foreground">
                  whatsapp: {storeSettings.whatsappId}
                </div>
              )}

              {storeSettings.wechatId && (
                <div className="text-sm pb-2 text-muted-foreground">
                  WeChat: {storeSettings.wechatId}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter />
        </Card>
      </motion.div>
    </motion.section>
  );
};
