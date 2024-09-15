"use client";

import { NavItems, NavPopover } from "@/components/Header";
import { Footer } from "@/components/home/Footer";
import { Hero } from "@/components/home/Hero";
import { Logo } from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import ProgressBar from "@badrap/bar-of-progress";
import clsx from "clsx";
//import Head from "next/head";
import Link from "next/link";
//import Router, { useRouter } from "next/router";
import { useEffect, useState } from "react";
import ScrollSpy from "react-ui-scrollspy";
import styles from "./index.module.css";

const progress = new ProgressBar({
  size: 2,
  color: "#38bdf8",
  className: "bar-of-progress",
  delay: 100,
});

// this fixes safari jumping to the bottom of the page
// when closing the search modal using the `esc` key
if (typeof window !== "undefined") {
  progress.start();
  progress.finish();
}
/*
Router.events.on("routeChangeStart", () => progress.start());
Router.events.on("routeChangeComplete", () => progress.finish());
Router.events.on("routeChangeError", () => progress.finish());
*/

function NavBar() {
  const [isOpaque, setIsOpaque] = useState(false);

  //const router = useRouter();
  useEffect(() => {
    const offset = 50;
    function onScroll() {
      if (!isOpaque && window.scrollY > offset) {
        setIsOpaque(true);
      } else if (isOpaque && window.scrollY <= offset) {
        setIsOpaque(false);
      }
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      //window.addEventListener("scroll", onScroll, { passive: true } as any);
    };
  }, [isOpaque]);

  return (
    <>
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
      <div
        className={clsx(
          "sticky top-0 z-40 w-full backdrop-blur flex-none transition-colors duration-500 lg:z-50 lg:border-b lg:border-slate-900/10 dark:border-slate-50/[0.06]",
          isOpaque
            ? "bg-white supports-backdrop-blur:bg-white/95 dark:bg-slate-900/75"
            : "bg-white/95 supports-backdrop-blur:bg-white/60 dark:bg-transparent",
        )}
      >
        <div className="mx-auto max-w-8xl">
          <div
            className={clsx(
              "py-4 border-b border-slate-900/10 lg:px-8 lg:border-0 dark:border-slate-300/10 mx-4 lg:mx-0",
            )}
          >
            <div className="relative flex items-center">
              <Link
                href="/"
                className="mr-3 flex-none w-[2.0625rem] overflow-hidden md:w-auto"
                onContextMenu={(e) => {
                  e.preventDefault();
                  //router.push("/");
                }}
              >
                <span className="sr-only">home page</span>
                <Logo className="w-auto h-5" />
              </Link>

              <div className="relative items-center hidden ml-auto lg:flex">
                <nav className="text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
                  <ul className="flex space-x-8">
                    <NavItems />
                  </ul>
                </nav>
                <div className="flex items-center pl-6 ml-6 border-l border-slate-200 dark:border-slate-800">
                  <ThemeToggle className="mt-8" />
                </div>
              </div>
              <NavPopover className="ml-2 -my-1" display="lg:hidden" />
            </div>
          </div>

          <div className="flex items-center p-4 border-b border-slate-900/10 lg:hidden dark:border-slate-50/[0.06]">
            <button
              type="button"
              //onClick={() => onNavToggle(!navIsOpen)}
              className="text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300"
            >
              <span className="sr-only">Navigation</span>
              <svg width="24" height="24" aria-hidden="true">
                <path
                  d="M5 6h14M5 12h14M5 18h14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Header() {
  return (
    <header className="relative">
      <div className="px-4 sm:px-6 md:px-8">
        <div
          className={clsx(
            "absolute inset-0 bottom-10 bg-bottom bg-no-repeat bg-slate-50 dark:bg-[#0B1120]",
            styles.beams,
          )}
        >
          <div
            className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] dark:bg-bottom dark:border-b dark:border-slate-100/5"
            style={{
              maskImage: "linear-gradient(to bottom, transparent, black)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent, black)",
            }}
          />
        </div>

        <div className="relative max-w-5xl pt-20 mx-auto sm:pt-24 lg:pt-32">
          <h1 className="text-3xl font-extrabold tracking-tight text-center text-slate-900 sm:text-5xl lg:text-5xl dark:text-white">
            導入線上點餐系統，讓您的銷售流程更順暢。
          </h1>
          <p className="max-w-3xl mx-auto mt-6 text-lg text-center text-slate-600 dark:text-slate-400">
            <code className="font-mono font-medium text-sky-500 dark:text-sky-400">
              沒有前置費用
            </code>
            、{" "}
            <code className="font-mono font-medium text-sky-500 dark:text-sky-400">
              增加營業額
            </code>
            、{" "}
            <code className="font-mono font-medium text-sky-500 dark:text-sky-400">
              客戶無需等待
            </code>
            、 只需手機或平版電腦，您就可以開始使用系統。{" "}
          </p>
          <div className="flex justify-center mt-6 space-x-6 text-sm sm:mt-10">
            <Link
              href="https://store.mingster.com"
              className="flex items-center justify-center w-full h-12 px-6 font-semibold text-white rounded-lg bg-slate-900 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 sm:w-auto dark:bg-sky-500 dark:highlight-white/20 dark:hover:bg-sky-400"
            >
              不用洽詢，立即使用
            </Link>
            {/*
            <SearchButton className="items-center hidden h-12 px-4 space-x-3 text-left bg-white rounded-lg shadow-sm sm:flex w-72 ring-1 ring-slate-900/10 hover:ring-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-400 dark:bg-slate-800 dark:ring-0 dark:text-slate-300 dark:highlight-white/5 dark:hover:bg-slate-700">
              {({ actionKey }) => (
                <>
                  <svg
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-none text-slate-300 dark:text-slate-400"
                    aria-hidden="true"
                  >
                    <path d="m19 19-3.5-3.5" />
                    <circle cx="11" cy="11" r="6" />
                  </svg>
                  <span className="flex-auto">Quick search...</span>
                  {actionKey && (
                    <kbd className="font-sans font-semibold dark:text-slate-500">
                      <abbr
                        title={actionKey[1]}
                        className="no-underline text-slate-300 dark:text-slate-500"
                      >
                        {actionKey[0]}
                      </abbr>{' '}
                      K
                    </kbd>
                  )}
                </>
              )}
            </SearchButton>
             */}
          </div>
        </div>
      </div>
      <Hero />
    </header>
  );
}

export default function Home() {
  return (
    <>
      <NavBar />

      <div className="mb-20 overflow-hidden sm:mb-32 md:mb-40">
        <Header />

        <section className="px-8 mt-20 text-center sm:mt-32 md:mt-40">
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            “Best practices” don’t actually work.
          </h2>
          <figure>
            <blockquote>
              <p className="max-w-3xl mx-auto mt-6 text-lg">
                I’ve written{" "}
                <a
                  href="https://adamwathan.me/css-utility-classes-and-separation-of-concerns/"
                  className="font-semibold text-sky-500 dark:text-sky-400"
                >
                  a few thousand words
                </a>{" "}
                on why traditional “semantic class names” are the reason CSS is
                hard to maintain, but the truth is you’re never going to believe
                me until you actually try it. If you can suppress the urge to
                retch long enough to give it a chance, I really think you’ll
                wonder how you ever worked with CSS any other way.
              </p>
            </blockquote>
            <figcaption className="flex items-center justify-center mt-6 space-x-4 text-left">
              <img
                src={require("@/img/adam.jpg").default.src}
                alt=""
                className="rounded-full w-14 h-14"
                loading="lazy"
                decoding="async"
              />
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  Adam Wathan
                </div>
                <div className="mt-0.5 text-sm leading-6">
                  Creator of Tailwind CSS
                </div>
              </div>
            </figcaption>
          </figure>
        </section>
      </div>
      <div className="flex flex-col pt-20 mb-20 overflow-hidden gap-y-20 sm:pt-32 sm:mb-32 sm:gap-y-32 md:pt-40 md:mb-40 md:gap-y-40">
        <ScrollSpy scrollThrottle={100} useBoxMethod={false}>
          CONTENT
          {/*
          <Testimonials />

          <UseCases />
          <Features />
          <Cost />
          <FAQ />
          <AboutUs />
          <StateVariants />
          <ComponentDriven />
          <DarkMode />
          <Customization />
          <ModernFeatures />
          <ReadyMadeComponents />
*/}
        </ScrollSpy>
      </div>
      <Footer />
    </>
  );
}
