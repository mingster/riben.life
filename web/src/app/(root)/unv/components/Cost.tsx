import React from "react";
import { BigText, Caption, IconContainer, Paragraph } from "./common";
import Link from "next/link";
import clsx from "clsx";
import { motion } from "framer-motion";
import { slideIn, staggerContainer, fadeIn, textVariant } from "@/lib/motion";

export function Cost({ className, ...props }: { className?: string }) {
  return (
    <section id="cost" className="relative pb-20 h-screen">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
        <div className="flex gap-2">
          <IconContainer
            className="dark:bg-sky-500 dark:highlight-white/20"
            light={require("@/img/icons/home/editor-tools.png").default.src}
            dark={require("@/img/icons/home/dark/editor-tools.png").default.src}
          />{" "}
          <Caption className="text-sky-500">價格</Caption>
        </div>

        <div className="flex items-start w-full mx-auto max-w-7xl sm:px-6 md:px-8">
          <div
            className="items-start p-5 w-1/3 rounded h-[300px] dark:bg-slate-900
          hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50
          "
          >
            <BigText>基本版</BigText>
            <Paragraph>無需任何前置費用，有成交才會產生費用。</Paragraph>
            <Paragraph>
              適合每月營業額低於台幣五萬，或希望有更多時間準備的店家。
            </Paragraph>
          </div>
          <div
            className="items-start p-5 w-1/3 h-[300px] bg-green-100 dark:bg-transparent
          hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50
          "
          >
            <BigText>進階版</BigText>
            <Paragraph>每月只要台幣$300，隨開隨用所有進階功能。</Paragraph>
            <Paragraph>適合穩定營運的店家。</Paragraph>
          </div>

          <div
            className="items-start p-5 h-[300px] bg-red-100 rounded-lg dark:bg-red-950
          hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
          >
            <BigText>多店版</BigText>
            <Paragraph>
              每店面平台費用台幣$300，隨開隨用所有多店功能。
            </Paragraph>
            <Paragraph>適合連鎖品牌。</Paragraph>
          </div>
        </div>

        <Link
          href="/storeAdmin/"
          className="flex w-full m-5 p-5 items-center justify-center
          mx-auto max-w-7xl sm:px-6 md:px-8 h-12
          font-semibold text-white rounded-lg bg-slate-900
          hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50
          dark:bg-sky-500 dark:highlight-white/20 dark:hover:bg-sky-400"
        >
          不用洽詢，立即使用
        </Link>
      </div>
    </section>
  );
}
