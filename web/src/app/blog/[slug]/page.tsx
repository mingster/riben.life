import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next/types";
import { formatDate, getBlogPostBySlug, getBlogPostSlugs } from "../api";
import GridContainer from "../grid-container";
import { TableOfContents } from "../table-of-contents";

type Props = {
	params: Promise<{
		slug: string;
	}>;
};

export async function generateStaticParams() {
	const slugs = await getBlogPostSlugs();
	return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const post = await getBlogPostBySlug(params.slug);

	if (!post) {
		return notFound();
	}

	return {
		metadataBase: new URL("https://riben.life"),
		title: post.meta.title,
		description: post.meta.description,
		openGraph: {
			title: post.meta.title,
			description: post.meta.description,
			type: "article",
			url: `/blog/${params.slug}`,
			images: [
				{
					url: post.meta.image
						? post.meta.image.src
						: `/api/og?path=/blog/${params.slug}`,
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title: post.meta.title,
			description: post.meta.description,
			images: [
				{
					url: post.meta.image
						? post.meta.image.src
						: `/api/og?path=/blog/${params.slug}`,
				},
			],
			site: "@mingster",
			creator: "@mingster",
		},
	};
}

export default async function DocPage(props: Props) {
	const params = await props.params;
	const post = await getBlogPostBySlug(params.slug);

	if (!post) {
		return notFound();
	}

	return (
		<>
			{/* Add a placeholder div so the Next.js router can find the scrollable element. */}
			<div hidden />

			<div className="relative mx-auto max-w-7xl">
				<div className="flex flex-col">
					{/* Main Content */}
					<div className="flex-1 min-w-0 xl:pr-64">
						<div className="mt-16 px-4 font-mono text-sm/7 font-medium tracking-widest uppercase lg:px-2">
							<time dateTime={post.meta.date}>
								{formatDate(post.meta.date)}
							</time>
						</div>

						<GridContainer className="mb-6 px-4 lg:px-2 xl:mb-16">
							<h1 className="inline-block max-w-(--breakpoint-md) text-[2.5rem]/10 tracking-tight text-pretty max-lg:font-medium lg:text-4xl capitalize font-bold">
								{post.meta.title}
							</h1>
						</GridContainer>

						<div className="mb-8 px-4 lg:px-2">
							<div className="flex flex-col gap-4">
								{post.meta.authors.map((author) => (
									<GridContainer
										direction="to-left"
										key={author.twitter}
										className="flex items-center py-2 font-medium whitespace-nowrap"
									>
										<Author author={author} />
									</GridContainer>
								))}
							</div>
						</div>

						<article className="prose prose-blog max-w-(--breakpoint-lg) px-4 lg:px-2">
							<post.Component />
						</article>
					</div>

					{/* Table of Contents - Right Sidebar */}
					<div className="hidden xl:block">
						<div className="toc-scrollbar fixed right-10 top-1/2 -translate-y-1/2 w-64 max-h-[100vh] overflow-y-auto">
							<TableOfContents tableOfContents={post.tableOfContents} />
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

function Author({
	author,
}: {
	author: { avatar: string; twitter: string; name: string };
}) {
	return (
		<div className="flex gap-4">
			<Image
				src={author.avatar}
				alt=""
				className="size-12 rounded-full"
				width={36}
				height={36}
			/>
			<div className="flex flex-col justify-center gap-1 text-sm font-semibold">
				<div className="text-gray-950 dark:text-white">{author.name}</div>
				<div>
					<a
						href={`https://twitter.com/${author.twitter}`}
						target="_blank"
						rel="noopener noreferrer"
						className="text-sky-500 hover:text-sky-600 dark:text-sky-400"
					>
						@{author.twitter}
					</a>
				</div>
			</div>
		</div>
	);
}
