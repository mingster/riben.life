import { LayoutGroup, motion, useAnimation } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { fit } from "@/utils/fit";
//import debounce from "debounce";
import { useMedia } from "@/hooks/useMedia";
import { wait } from "@/utils/wait";

import colors from "tailwindcss/colors";

export function Hero() {
  return (
    <Layout
      left={
        <div className="lg:-mr-18">
          <LayoutGroup>TBD</LayoutGroup>
        </div>
      }
      right={<>TBD</>}
    />
  );
}

function Layout({
  left,
  right,
  pin = "left",
}: { left: React.ReactNode; right: React.ReactNode; pin?: "left" | "right" }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-20 sm:mt-24 lg:mt-32 lg:grid lg:gap-8 lg:grid-cols-12 lg:items-center">
      <div className="relative row-start-1 col-start-6 xl:col-start-7 col-span-7 xl:col-span-6">
        <div className="-mx-4 sm:mx-0">{right}</div>
      </div>
      <div className="relative row-start-1 col-start-1 col-span-5 xl:col-span-6 -mt-10">
        <div className="h-[24.25rem] max-w-xl mx-auto lg:max-w-none flex items-center justify-center">
          <div className="w-full flex-none">{left}</div>
        </div>
      </div>
    </div>
  );
}
