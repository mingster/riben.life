import { ArrowBigUpDash } from "lucide-react";
import React from "react";

export function Footer({ className, ...props }: { className?: string }) {
  return (

    <footer className="">
      {/* scroll up to top */}
      <div className="xs:bottom-10 bottom-32 w-full">
        <div className="flex justify-between flex-row content-end items-end py-1">
          <div className="px-1 lg:px-10 text-sm uppercase">

          </div>

          <div className="">
            <a href="#top" title="scroll up to top">
              <ArrowBigUpDash className="w-[35px] h-[35px]" />
            </a>
          </div>

          <div className="text-sm uppercase pr-5">

          </div>
        </div>
      </div>
    </footer>

  );
}
