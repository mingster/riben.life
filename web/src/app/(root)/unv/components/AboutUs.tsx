import React from "react";
import { BigText, Caption, IconContainer, Paragraph } from "./common";
import Link from "next/link";

export function AboutUs({ className, ...props }: { className?: string }) {
  return (
    <section id="aboutUs" className="relative h-screen">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
        <div className="flex gap-2">
          <IconContainer
            className="dark:bg-sky-500 dark:highlight-white/20"
            light={require("@/img/icons/home/editor-tools.png").default.src}
            dark={require("@/img/icons/home/dark/editor-tools.png").default.src}
          />
          <Caption className="text-sky-500">關於我們</Caption>
        </div>
        
        <BigText>World-class IDE integration.</BigText>
        <Paragraph>
          <p>
            Worried about remembering all of these class names? The Tailwind CSS
            IntelliSense extension for VS Code has you covered.
          </p>
          <p>
            Get intelligent autocomplete suggestions, linting, class definitions
            and more, all within your editor and with no configuration required.
          </p>
        </Paragraph>

        <Link href="/docs/intellisense" className="text-sky-600 dark:text-gray">
          Learn more<span className="sr-only">, editor setup</span>
        </Link>
      </div>
    </section>
  );
}
