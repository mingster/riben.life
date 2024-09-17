import Link from "next/link";

import { Hero } from "./Hero";
import { Logo } from "@/components/Logo";

import clsx from "clsx";
import Router from "next/router";
import { useEffect, useState } from "react";
import styles from "../../../css/index.module.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import ThemeToggler from "@/components/theme-toggler";

export function NavPopover({
  display = "md:hidden",
  className,
  ...props
}: {
  display?: string;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    function handleRouteChange() {
      setIsOpen(false);
    }
    Router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      Router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [isOpen]);

  return (
    <div className={clsx(className, display)} {...props}>
      <Dialog
        open={isOpen}
        //onClose={setIsOpen}
        //className={clsx("fixed z-50 inset-0", display)}
      >
      <DialogTrigger asChild>
      {/* close button */}
      <button
        type="button"
        className="flex items-center justify-center w-8 h-8 text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300"
        onClick={() => setIsOpen(true)}
      >
        <span className="sr-only">Navigation</span>
        <svg width="24" height="24" fill="none" aria-hidden="true">
          <path
            d="M12 6v.01M12 12v.01M12 18v.01M12 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      </DialogTrigger>


        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm dark:bg-slate-900/80" />
        <DialogContent className="fixed w-full max-w-xs p-6 text-base font-semibold bg-white rounded-lg shadow-lg top-4 right-4 text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:highlight-white/5">
          <button
            type="button"
            className="absolute flex items-center justify-center w-8 h-8 top-5 right-5 text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300"
            onClick={() => setIsOpen(false)}
          >
            <span className="sr-only">Close navigation</span>
            <svg
              viewBox="0 0 10 10"
              className="w-2.5 h-2.5 overflow-visible"
              aria-hidden="true"
            >
              <path
                d="M0 0L10 10M10 0L0 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <ul className="space-y-6">
            <NavItems />
          </ul>
          <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-200/10">
            <ThemeToggler />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const onNavlinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();
  const target = window.document.getElementById(
    e.currentTarget.href.split("#")[1],
  );
  if (target) {
    target.scrollIntoView({ behavior: "smooth" });
  }
};

export function NavItems() {
  return (
    <>
      <li>
        <Link
          data-to-scrollspy-id="useCases"
          onClick={(e) => onNavlinkClick(e)}
          href="#useCases"
          className="hover:text-sky-500 dark:hover:text-sky-400"
        >
          使用情境
        </Link>
      </li>

      <li>
        <Link
          data-to-scrollspy-id="features"
          onClick={(e) => onNavlinkClick(e)}
          href="#features"
          className="hover:text-sky-500 dark:hover:text-sky-400"
        >
          功能表
        </Link>
      </li>
      <li>
        <Link
          data-to-scrollspy-id="cost"
          onClick={(e) => onNavlinkClick(e)}
          href="#cost"
          className="hover:text-sky-500 dark:hover:text-sky-400"
        >
          價格
        </Link>
      </li>

      <li>
        <Link
          data-to-scrollspy-id="faq"
          onClick={(e) => onNavlinkClick(e)}
          href="#faq"
          className="hover:text-sky-500 dark:hover:text-sky-400"
        >
          常見問題
        </Link>
      </li>
      <li>
        <Link
          data-to-scrollspy-id="aboutUs"
          onClick={(e) => onNavlinkClick(e)}
          href="#aboutUs"
          className="hover:text-sky-500 dark:hover:text-sky-400"
        >
          關於我們
        </Link>
      </li>
      <li>
        <Link
          href="/storeAdmin/"
          className="hover:text-sky-500 dark:hover:text-sky-400"
        >
          店家後台
        </Link>
      </li>
    </>
  );
}

export function NavBar() {
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
            <div className="relative flex items-center justify-between">
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
                    <li className="pl-6 ml-6 border-l border-slate-200 dark:border-slate-800">
                      <ThemeToggler />
                    </li>
                  </ul>
                </nav>
              </div>
              {/* display popover on mobile */}
              <NavPopover className="ml-2 -my-1" display="lg:hidden" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function Header() {
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
              href="/storeAdmin/"
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
