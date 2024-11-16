"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Container from "@/components/ui/container";
import { MonitorX } from "lucide-react";
import { useSearchParams } from "next/navigation";

//import { useI18n } from '@/providers/i18n-provider';
//import { useTranslation } from '@/app/i18n/client';
export default function Home() {
  //const { lng } = useI18n();
  //const { t } = useTranslation(lng);

  const searchParams = useSearchParams();
  const errCode = searchParams.get("code");
  const message = searchParams.get("message");

  return (
    <div className="bg-red-900 h-screen w-full flex items-center align-middle">
      <Container>
        <Card className="basis-1/2 lg:min-h-[500px]">
          <CardHeader>
            <CardTitle className="flex gap-2 text-3xl text-primary items-center">
              <MonitorX className="size-10" />
              Error
            </CardTitle>
            <CardDescription>{errCode}</CardDescription>
          </CardHeader>
          <CardContent>
            {message && <div className="pt-10">{message}</div>}
          </CardContent>
          <CardFooter> </CardFooter>
        </Card>
      </Container>
    </div>
  );
}
