"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import Link from "next/link";

export const AdminMockupContent = () => {
  const { toast } = useToast();

  return (
    <>
      <div className="container relative pb-10">
        <section className="mx-auto flex max-w-[980px] flex-col items-center gap-2 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-6">
          <h1 className="text-center text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:leading-[1.1]">
            Admin Dashboard
          </h1>
          <span className="max-w-[750px] text-center text-lg font-light text-foreground">
            管理員後台
          </span>
          <div className="flex w-full items-center justify-center space-x-4 py-4 md:pb-6">
            <Button variant="outline" asChild>
              <Link href="#">
                Demo
                <ArrowRightIcon className="ml-2" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link
                href="https://ui.shadcn.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn shadcn/ui
              </Link>
            </Button>
            <Button
              onClick={() => {
                console.log("click me");
                toast({
                  title: "Scheduled: Catch up",
                  description: "Friday, February 10, 2023 at 5:57 PM",
                });
              }}
            >
              Show Toast
            </Button>
          </div>
        </section>
        <div className="relative flex w-full justify-center"> </div>
      </div>
    </>
  );
};
