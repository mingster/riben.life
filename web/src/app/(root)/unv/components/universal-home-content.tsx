"use client";

import { DataTable } from "@/components/dataTable";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { useToast } from "@/components/ui/use-toast";
import VideoPlayer from "@/components/video-player";
import type { ColumnDef } from "@tanstack/react-table";
import useSWR from "swr";
import { Header, NavBar } from "./Header";

import ScrollSpy from "react-ui-scrollspy";
import "../../../css/base.css";
import "../../../css/utilities.css";

import Image from "next/image";
import { AboutUs } from "./AboutUs";
import { Cost } from "./Cost";
import { FAQ } from "./FAQ";
import { Features } from "./Features";
import { Footer } from "./Footer";
import { UseCases } from "./UseCases";

export const UniversalHomeContent = () => {
	const { toast } = useToast();

	return (
		<>
			<NavBar />

			<div className="mb-20 overflow-hidden sm:mb-32 md:mb-40 p">
				<Header />
				{/*
        <section className="px-8 mt-20 text-center sm:mt-32 md:mt-40">
          <figure>
            <blockquote>
              <p className="max-w-3xl mx-auto mt-6 text-lg">
                I&#34;ve written{" "}
                <a
                  href="https://adamwathan.me/css-utility-classes-and-separation-of-concerns/"
                  className="font-semibold text-sky-500 dark:text-sky-400"
                >
                  a few thousand words
                </a>{" "}
                on why traditional &ldquo;semantic class names&rdquo; are the
                reason CSS is hard to maintain, but the truth is you&#34;re
                never going to believe me until you actually try it. If you can
                suppress the urge to retch long enough to give it a chance, I
                really think you&#34;ll wonder how you ever worked with CSS any
                other way.
              </p>
            </blockquote>
            <figcaption className="flex items-center justify-center mt-6 space-x-4 text-left">
              <Image
                src={require("@/img/adam.jpg").default.src}
                alt=""
                className="rounded-full w-14 h-14"
                width={56}
                height={56}
                loading="lazy"
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
         */}
			</div>
			<div className="flex flex-col pt-20 mb-20 overflow-hidden gap-y-20 sm:pt-32 sm:mb-32 sm:gap-y-32 md:pt-40 md:mb-40 md:gap-y-40">
				<ScrollSpy scrollThrottle={100} useBoxMethod={false}>
					<UseCases />
					<Features />
					<Cost />
					<AboutUs />

					{/*
          <FAQ />
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
};
