import React from "react";
import { BigText, Caption, IconContainer, Paragraph } from "./common";
import Link from "next/link";
import clsx from "clsx";
import { motion } from "framer-motion";

export function UseCases({ className, ...props }: { className?: string }) {
  return (
    <section id="useCases" className="relative h-screen">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
        <div className="flex gap-2">
          <IconContainer
            className="dark:bg-sky-500 dark:highlight-white/20"
            light={require("@/img/icons/home/editor-tools.png").default.src}
            dark={require("@/img/icons/home/dark/editor-tools.png").default.src}
          />
          <Caption className="text-sky-500">使用情境</Caption>
        </div>
      </div>
    </section>
  );
}
