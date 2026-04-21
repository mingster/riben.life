import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import {
	formatDate,
	getBlogPostBySlug,
	getBlogPostSlugs,
	nonNullable,
} from "./api";
import GridContainer from "./grid-container";

export const metadata: Metadata = {
	title: "Blog",
	description: "",
	openGraph: {
		type: "article",
		title: "Latest updates - Blog",
		description: "",
		images: "https://riben.life/api/og?path=/blog",
		url: "https://riben.life/blog",
	},
};

export default async function Blog() {
	const slugs = await getBlogPostSlugs();
	const posts = (await Promise.all(slugs.map(getBlogPostBySlug)))
		.filter(nonNullable)
		.filter((post) => !post.meta.private);

	return (
		<div className="relative mx-auto max-lg:max-w-4xl text-white-foreground">
			<GridContainer>
				<h1 className="mx-2 text-2xl tracking-tighter text-balance sm:text-3xl lg:text-4xl font-bold">
					Latest Updates
				</h1>
			</GridContainer>

			<div className="mt-12 mb-46 grid grid-cols-1 lg:grid-cols-[24rem_2.5rem_minmax(0,1fr)]">
				{posts.map(({ meta, slug }) => (
					<Fragment key={slug}>
						<GridContainer className="p col-span-3 grid grid-cols-subgrid divide-x divide-gray-950/5 dark:divide-white/10">
							<div className="">
								<Link
									href={`/blog/${slug}`}
									className="font-semibold font-mono capitalize text-3xl tracking-tighter sm:text-xl lg:text-2xl"
								>
									{meta.title}
								</Link>
								<div className="mb-4 font-mono text-sm/6 font-medium tracking-widest uppercase lg:hidden">
									{formatDate(meta.date)}
								</div>
								{meta.excerpt && (
									<div className="prose prose-blog mt-4 line-clamp-3 leading-7">
										{meta.excerpt}
									</div>
								)}
								<Link
									href={`/blog/${slug}`}
									className="inline-block text-sm font-semibold text-sky-500 hover:text-sky-600 dark:text-sky-400"
								>
									Read more
								</Link>
							</div>
						</GridContainer>
					</Fragment>
				))}
			</div>
		</div>
	);
}
