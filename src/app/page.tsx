"use client";

import { Header, NavBar } from "@/components/Header";
import { Footer } from "@/components/home/Footer";
import ProgressBar from "@badrap/bar-of-progress";
import { AboutUs } from "@/components/home/AboutUs";
import { Cost } from "@/components/home/Cost";
import { FAQ } from "@/components/home/FAQ";
import { Features } from "@/components/home/Features";
import { UseCases } from "@/components/home/UseCases";
import ScrollSpy from "react-ui-scrollspy";

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

export default function Home() {
  return (
    <>
      <NavBar />

      <div className="mb-20 overflow-hidden sm:mb-32 md:mb-40 p">
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
          <UseCases />
          <Features />
          <Cost />
          <FAQ />
          <AboutUs />

          {/*
          <Testimonials />
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
