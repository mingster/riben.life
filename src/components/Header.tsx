import Link from "next/link";

import ThemeToggle from "@/components/ThemeToggle";
import { Dialog, DialogPanel } from "@headlessui/react";
import clsx from "clsx";
import Router from "next/router";
import { useEffect, useState } from "react";


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
      <Dialog
        open={isOpen}
        onClose={setIsOpen}
        className={clsx("fixed z-50 inset-0", display)}
      >
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm dark:bg-slate-900/80" />
        <DialogPanel className="fixed w-full max-w-xs p-6 text-base font-semibold bg-white rounded-lg shadow-lg top-4 right-4 text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:highlight-white/5">
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
            <ThemeToggle />
          </div>
        </DialogPanel>
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
          data-to-scrollspy-id="usecase"
          onClick={(e) => onNavlinkClick(e)}
          href="#usecase"
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
          href="https://store.mingster.com"
          className="hover:text-sky-500 dark:hover:text-sky-400"
        >
          店家後台
        </Link>
      </li>
    </>
  );
}
