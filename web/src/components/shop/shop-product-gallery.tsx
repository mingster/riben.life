"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";

export interface ShopGalleryImage {
	id: string;
	url: string;
	alt: string;
}

interface ShopProductGalleryProps {
	images: ShopGalleryImage[];
	className?: string;
}

/**
 * Primary PDP gallery: main image + thumbnail strip. Uses 4:5 mobile, square lg to match PLP/PDP layout.
 */
export function ShopProductGallery({
	images,
	className,
}: ShopProductGalleryProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "shop");
	const [activeIndex, setActiveIndex] = useState(0);
	const safe = images.length > 0 ? images : [];
	const current = safe[activeIndex] ?? safe[0];

	if (safe.length === 0) {
		return (
			<div
				className={cn(
					"relative flex aspect-4/5 items-center justify-center rounded-lg border border-border/60 bg-muted/30 lg:aspect-square",
					className,
				)}
			>
				<p className="text-sm text-muted-foreground">
					{t("shop_category_no_image")}
				</p>
			</div>
		);
	}

	return (
		<div className={cn("space-y-4", className)}>
			<div className="relative aspect-4/5 overflow-hidden rounded-lg border border-border/60 bg-muted/30 lg:aspect-square">
				<Image
					src={current.url}
					alt={current.alt}
					fill
					className="h-full w-full max-w-none object-cover"
					priority={activeIndex === 0}
					loading="eager"
					sizes="(max-width: 1024px) 100vw, 50vw"
				/>
			</div>
			{safe.length > 1 ? (
				<ul className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					{safe.map((img, i) => (
						<li key={img.id} className="shrink-0">
							<button
								type="button"
								onClick={() => setActiveIndex(i)}
								className={cn(
									"relative size-16 overflow-hidden rounded-md border-2 transition-colors sm:size-20",
									i === activeIndex
										? "border-foreground"
										: "border-transparent opacity-70 hover:opacity-100",
								)}
								aria-label={t("shop_gallery_view_image_n", { n: i + 1 })}
								aria-current={i === activeIndex}
							>
								<Image
									src={img.url}
									alt=""
									fill
									className="h-full w-full max-w-none object-cover"
									sizes="80px"
								/>
							</button>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
