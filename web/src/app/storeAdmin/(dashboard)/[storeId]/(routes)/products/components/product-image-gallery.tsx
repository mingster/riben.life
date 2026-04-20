"use client";

import {
	IconChevronDown,
	IconChevronUp,
	IconFile,
	IconPhotoPlus,
	IconTrash,
} from "@tabler/icons-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { ProductImageColumn } from "@/lib/store-admin/map-product-column";
import { useI18n } from "@/providers/i18n-provider";
import { shouldUnoptimizeRemoteImageUrl } from "@/utils/remote-image";

function urlLooksPreviewableAsImage(url: string): boolean {
	const path = url.split("?")[0] ?? "";
	return /\.(jpe?g|png|webp|gif)$/i.test(path);
}

function fileToBase64Payload(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result;
			if (typeof result !== "string") {
				reject(new Error("Failed to read file"));
				return;
			}
			const comma = result.indexOf(",");
			resolve(comma >= 0 ? result.slice(comma + 1) : result);
		};
		reader.onerror = () =>
			reject(reader.error ?? new Error("Failed to read file"));
		reader.readAsDataURL(file);
	});
}

interface ProductImageGalleryProps {
	storeId: string;
	productId: string;
	initialImages: ProductImageColumn[];
}

export function ProductImageGallery({
	storeId,
	productId,
	initialImages,
}: ProductImageGalleryProps) {
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const imagesSnapshot = useMemo(
		() => JSON.stringify(initialImages),
		[initialImages],
	);

	const [images, setImages] = useState<ProductImageColumn[]>(initialImages);
	const [uploading, setUploading] = useState(false);
	const [pendingMeta, setPendingMeta] = useState<
		Record<string, { altText: string; mediaType: string }>
	>({});

	useEffect(() => {
		setImages(JSON.parse(imagesSnapshot) as ProductImageColumn[]);
		setPendingMeta({});
	}, [imagesSnapshot]);

	const apiBase = `/api/storeAdmin/${storeId}/product/${productId}/image`;

	const getMeta = useCallback(
		(img: ProductImageColumn) =>
			pendingMeta[img.id] ?? {
				altText: img.altText ?? "",
				mediaType: img.mediaType || "image",
			},
		[pendingMeta],
	);

	const setMetaField = useCallback(
		(id: string, field: "altText" | "mediaType", value: string) => {
			setPendingMeta((prev) => {
				const img = images.find((i) => i.id === id);
				const base = img
					? {
							altText: img.altText ?? "",
							mediaType: img.mediaType || "image",
						}
					: { altText: "", mediaType: "image" };
				const cur = prev[id] ?? base;
				return {
					...prev,
					[id]: { ...cur, [field]: value },
				};
			});
		},
		[images],
	);

	const persistReorder = async (next: ProductImageColumn[]) => {
		const reorder = next.map((img, index) => ({
			id: img.id,
			sortOrder: index,
		}));
		const res = await fetch(apiBase, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ reorder }),
		});
		if (!res.ok) {
			const text = await res.text();
			toastError({
				title: t("error_title"),
				description: text || res.statusText,
			});
			return;
		}
		const list = (await res.json()) as ProductImageColumn[];
		setImages(
			list
				.slice()
				.sort((a, b) => a.sortOrder - b.sortOrder)
				.map((row) => ({
					id: row.id,
					url: row.url,
					imgPublicId: row.imgPublicId,
					sortOrder: row.sortOrder,
					altText: row.altText ?? null,
					mediaType: row.mediaType ?? "image",
				})),
		);
		toastSuccess({
			title: t("product_image_order_saved"),
			description: "",
		});
		router.refresh();
	};

	const move = async (index: number, delta: number) => {
		const j = index + delta;
		if (j < 0 || j >= images.length) {
			return;
		}
		const next = [...images];
		[next[index], next[j]] = [next[j], next[index]];
		await persistReorder(next);
	};

	const saveMeta = async (img: ProductImageColumn) => {
		const meta = getMeta(img);
		const res = await fetch(apiBase, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				id: img.id,
				altText: meta.altText.trim() === "" ? null : meta.altText.trim(),
				mediaType: meta.mediaType,
			}),
		});
		if (!res.ok) {
			const text = await res.text();
			toastError({
				title: t("error_title"),
				description: text || res.statusText,
			});
			return;
		}
		const row = (await res.json()) as ProductImageColumn;
		setImages((prev) =>
			prev.map((p) =>
				p.id === row.id
					? {
							id: row.id,
							url: row.url,
							imgPublicId: row.imgPublicId,
							sortOrder: row.sortOrder,
							altText: row.altText ?? null,
							mediaType: row.mediaType ?? "image",
						}
					: p,
			),
		);
		setPendingMeta((prev) => {
			const copy = { ...prev };
			delete copy[img.id];
			return copy;
		});
		toastSuccess({
			title: t("product_image_meta_saved"),
			description: "",
		});
		router.refresh();
	};

	const remove = async (img: ProductImageColumn) => {
		const res = await fetch(`${apiBase}/${img.id}`, { method: "DELETE" });
		if (!res.ok) {
			const text = await res.text();
			toastError({
				title: t("error_title"),
				description: text || res.statusText,
			});
			return;
		}
		setImages((prev) => prev.filter((p) => p.id !== img.id));
		toastSuccess({
			title: t("product_image_deleted"),
			description: "",
		});
		router.refresh();
	};

	const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) {
			return;
		}
		setUploading(true);
		try {
			// JSON + base64: works when proxies or stacks coerce uploads to application/json,
			// and avoids Undici multipart/raw-body edge cases in some browsers.
			const base64 = await fileToBase64Payload(file);
			const res = await fetch(apiBase, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					base64,
					mimeType: file.type && file.type.trim() !== "" ? file.type : null,
				}),
				credentials: "same-origin",
			});
			if (!res.ok) {
				const text = await res.text();
				toastError({
					title: t("error_title"),
					description: text || res.statusText,
				});
				return;
			}
			const row = (await res.json()) as ProductImageColumn;
			setImages((prev) =>
				[...prev, row].sort((a, b) => a.sortOrder - b.sortOrder),
			);
			toastSuccess({
				title: t("product_image_uploaded"),
				description: "",
			});
			router.refresh();
		} catch (err: unknown) {
			toastError({
				title: t("error_title"),
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setUploading(false);
		}
	};

	return (
		<section className="mt-8 space-y-4 border-t pt-6">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-base font-semibold">{t("product_tab_images")}</h2>
					<p className="text-muted-foreground text-sm">
						{t("product_image_gallery_descr")}
					</p>
				</div>
				<div>
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp,image/gif,.glb,.fbx,model/gltf-binary,model/fbx,application/vnd.autodesk.fbx"
						className="hidden"
						id={`product-image-upload-${productId}`}
						disabled={uploading}
						onChange={onFile}
					/>
					<Button
						type="button"
						variant="outline"
						disabled={uploading}
						className="touch-manipulation"
						onClick={() =>
							document
								.getElementById(`product-image-upload-${productId}`)
								?.click()
						}
					>
						<IconPhotoPlus className="mr-2 size-4" />
						{uploading ? t("saving") : t("product_image_upload")}
					</Button>
				</div>
			</div>

			{images.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					{t("product_image_empty")}
				</p>
			) : (
				<ul className="space-y-4">
					{images.map((img, index) => {
						const meta = getMeta(img);
						const remote =
							img.url.startsWith("http://") || img.url.startsWith("https://");
						return (
							<li
								key={img.id}
								className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-start"
							>
								<div className="relative mx-auto size-28 shrink-0 overflow-hidden rounded-md bg-muted sm:mx-0">
									{urlLooksPreviewableAsImage(img.url) ? (
										<Image
											src={img.url}
											alt={meta.altText || img.altText || ""}
											fill
											className="object-cover"
											sizes="112px"
											unoptimized={
												!remote ||
												shouldUnoptimizeRemoteImageUrl(img.url) ||
												img.url.includes("localhost")
											}
										/>
									) : (
										<div
											className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center"
											title={img.url}
										>
											<IconFile
												className="size-8 text-muted-foreground"
												aria-hidden
											/>
											<span className="text-muted-foreground text-[10px] leading-tight">
												GLB / FBX
											</span>
										</div>
									)}
								</div>
								<div className="min-w-0 flex-1 space-y-2">
									<div className="space-y-1">
										<Label htmlFor={`alt-${img.id}`}>
											{t("product_image_alt_text")}
										</Label>
										<Input
											id={`alt-${img.id}`}
											value={meta.altText}
											onChange={(e) =>
												setMetaField(img.id, "altText", e.target.value)
											}
											className="h-10 text-base sm:h-9 sm:text-sm"
											placeholder={t("product_image_alt_placeholder")}
										/>
									</div>
									<div className="space-y-1">
										<Label>{t("product_image_media_type")}</Label>
										<Select
											value={meta.mediaType || "image"}
											onValueChange={(v) =>
												setMetaField(img.id, "mediaType", v)
											}
										>
											<SelectTrigger className="h-10 sm:h-9">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="image">image</SelectItem>
												<SelectItem value="video">video</SelectItem>
												<SelectItem value="other">other</SelectItem>
											</SelectContent>
										</Select>
									</div>
									<div className="flex flex-wrap gap-2">
										<Button
											type="button"
											size="sm"
											variant="secondary"
											className="touch-manipulation"
											onClick={() => saveMeta(img)}
										>
											{t("product_image_save_meta")}
										</Button>
										<Button
											type="button"
											size="icon"
											variant="outline"
											className="size-10 touch-manipulation sm:size-9"
											disabled={index === 0}
											onClick={() => move(index, -1)}
											aria-label={t("product_image_move_up")}
										>
											<IconChevronUp className="size-4" />
										</Button>
										<Button
											type="button"
											size="icon"
											variant="outline"
											className="size-10 touch-manipulation sm:size-9"
											disabled={index === images.length - 1}
											onClick={() => move(index, 1)}
											aria-label={t("product_image_move_down")}
										>
											<IconChevronDown className="size-4" />
										</Button>
										<Button
											type="button"
											size="icon"
											variant="destructive"
											className="size-10 touch-manipulation sm:size-9"
											onClick={() => remove(img)}
											aria-label={t("product_image_delete")}
										>
											<IconTrash className="size-4" />
										</Button>
									</div>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
