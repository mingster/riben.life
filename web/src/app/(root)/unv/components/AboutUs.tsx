import React from "react";
import { BigText, Caption, IconContainer, Paragraph } from "./common";
import Link from "next/link";
import { motion } from "framer-motion";

export function AboutUs({ className, ...props }: { className?: string }) {
  return (
    <section id="aboutUs" className="relative min-h-screen">
      <motion.section
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        className="px-1 lg:px-10 w-full py-10"
      >

        <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8 overflow-hidden">
          <motion.div
            //variants={slideIn("left", "tween", 0.2, 1)}
            className="flex-[0.75] bg-black-100 p-2 rounded-2xl"
          >


            <div className="flex gap-2">
              <IconContainer
                className="dark:bg-sky-500 dark:highlight-white/20"
                light={require("@/img/icons/home/editor-tools.png").default.src}
                dark={require("@/img/icons/home/dark/editor-tools.png").default.src}
              />
              <Caption className="text-sky-500">關於我們</Caption>
            </div>

            <BigText>World-class system integration.</BigText>
            <Paragraph>
              <p>
                We are a team of engineers, designers, and developers who love to improve things in life.
              </p>
              <p>

                Get intelligent autocomplete suggestions, linting, class definitions
                and more, all within your editor and with no configuration required.
              </p>
            </Paragraph>


          </motion.div>
        </div>
      </motion.section>

    </section>
  );
}
