import Link from "next/link";
import { BigText, Caption, IconContainer, Paragraph } from "./common";

export function Cost({ className, ...props }: { className?: string }) {
  return (
    <section id="cost" className="relative h-screen">
      {/*background */}
      <div className="absolute inset-x-0 top-0 z-20 flex justify-center overflow-hidden pointer-events-none">
        <div className="w-[108rem] flex-none flex justify-end">
          <picture>
            <source
              srcSet={require("@/img/beams/docs@30.avif").default.src}
              type="image/avif"
            />
            <img
              src={require("@/img/beams/docs@tinypng.png").default.src}
              alt=""
              className="w-[71.75rem] flex-none max-w-none dark:hidden"
              decoding="async"
            />
          </picture>
          <picture>
            <source
              srcSet={require("@/img/beams/docs-dark@30.avif").default.src}
              type="image/avif"
            />
            <img
              src={require("@/img/beams/docs-dark@tinypng.png").default.src}
              alt=""
              className="w-[90rem] flex-none max-w-none hidden dark:block"
              decoding="async"
            />
          </picture>
        </div>
      </div>

      {/* content */}
      <div className="pt-10 px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
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
