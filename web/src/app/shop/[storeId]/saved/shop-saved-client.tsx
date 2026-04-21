"use client";

import { IconHeart, IconPalette } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { deleteSavedCustomizationAction } from "@/actions/user/saved-customization/delete-saved-customization";
import { listSavedCustomizationsAction } from "@/actions/user/saved-customization/list-saved-customizations";
import { useTranslation } from "@/app/i18n/client";
import { Loader } from "@/components/loader";
import { useSavedDesigns } from "@/hooks/use-saved-designs";
import { useWishlist } from "@/hooks/use-wishlist";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";

export interface CloudDesignRow {
	id: string;
	productId: string;
	productName: string;
	updatedAt: number;
	createdAt: number;
}

function mapCloudRows(
	items: Array<{
		id: string;
		productId: string;
		productName: string;
		updatedAt: bigint | number;
		createdAt: bigint | number;
	}>,
): CloudDesignRow[] {
	return items.map((row) => ({
		id: row.id,
		productId: row.productId,
		productName: row.productName,
		updatedAt: Number(row.updatedAt),
		createdAt: Number(row.createdAt),
	}));
}

export interface ShopSavedClientProps {
	storeId: string;
	initialCloudDesigns: CloudDesignRow[];
	/** True when the server request had an authenticated session (SSR/RSC). */
	serverHadSession: boolean;
}

export function ShopSavedClient({
	storeId,
	initialCloudDesigns,
	serverHadSession,
}: ShopSavedClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "shop");
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const { items: wishlist } = useWishlist();
	const { items: localDesigns, remove: removeLocal } = useSavedDesigns();

	const [cloudDesigns, setCloudDesigns] =
		useState<CloudDesignRow[]>(initialCloudDesigns);
	const [cloudLoading, setCloudLoading] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	useEffect(() => {
		setCloudDesigns(initialCloudDesigns);
	}, [initialCloudDesigns]);

	/** Prefer server hint while client session is hydrating so list + copy match signed-in users. */
	const accountMode = sessionPending
		? serverHadSession
		: Boolean(session?.user);

	const loadCloud = useCallback(async () => {
		setCloudLoading(true);
		try {
			const result = await listSavedCustomizationsAction({});
			if (result?.serverError) {
				toast.error(result.serverError);
				setCloudDesigns([]);
				return;
			}
			const items = result?.data?.items;
			if (Array.isArray(items)) {
				setCloudDesigns(mapCloudRows(items));
			}
		} catch {
			toast.error(t("shop_saved_error_generic"));
			setCloudDesigns([]);
		} finally {
			setCloudLoading(false);
		}
	}, [t]);

	/** When the user signs in only on the client (no SSR session), load from the action. */
	useEffect(() => {
		if (sessionPending) return;
		if (!session?.user) {
			setCloudDesigns([]);
			return;
		}
		if (!serverHadSession) {
			void loadCloud();
		}
	}, [sessionPending, session?.user, loadCloud, serverHadSession]);

	const designsSectionLoading = sessionPending && !serverHadSession;

	const handleDeleteCloud = async (id: string) => {
		setDeletingId(id);
		try {
			const result = await deleteSavedCustomizationAction({ id });
			if (result?.serverError) {
				toast.error(result.serverError);
				return;
			}
			setCloudDesigns((prev) => prev.filter((row) => row.id !== id));
		} catch {
			toast.error(t("shop_saved_error_generic"));
		} finally {
			setDeletingId(null);
		}
	};

	return (
		<div className="space-y-10">
			<div>
				<h1 className=" text-3xl font-light tracking-tight">
					{t("shop_saved_title")}
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					{accountMode
						? t("shop_saved_intro_account")
						: t("shop_saved_intro_local")}
				</p>
			</div>

			<section className="space-y-4">
				<h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
					{t("shop_saved_wishlist_heading")}
				</h2>
				{wishlist.length === 0 ? (
					<p className="flex items-center gap-2 text-sm text-muted-foreground">
						<IconHeart className="size-4" />
						{t("shop_saved_wishlist_empty")}
					</p>
				) : (
					<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{wishlist.map((entry) => (
							<li key={entry.productId}>
								<Link
									href={`/shop/${storeId}/p/${entry.productId}`}
									className="flex gap-4 rounded-lg border border-border/80 p-4 transition-colors hover:bg-card"
								>
									<div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
										{entry.imageUrl ? (
											<Image
												src={entry.imageUrl}
												alt=""
												fill
												className="h-full w-full max-w-none object-cover"
												sizes="80px"
											/>
										) : null}
									</div>
									<div className="min-w-0">
										<p className="font-medium leading-snug">{entry.name}</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{t("shop_saved_view_product")}
										</p>
									</div>
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>

			<section className="space-y-4">
				<h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
					{t("shop_saved_designs_heading")}
				</h2>
				{designsSectionLoading ? (
					<div className="flex justify-center py-8">
						<Loader />
					</div>
				) : accountMode ? (
					cloudLoading ? (
						<div className="flex justify-center py-8">
							<Loader />
						</div>
					) : cloudDesigns.length === 0 ? (
						<p className="flex items-center gap-2 text-sm text-muted-foreground">
							<IconPalette className="size-4" />
							{t("shop_saved_designs_empty_account")}
						</p>
					) : (
						<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{cloudDesigns.map((entry) => (
								<li
									key={entry.id}
									className="flex flex-col gap-3 rounded-lg border border-border/80 p-4"
								>
									<div className="min-w-0">
										<p className="font-medium leading-snug">
											{entry.productName}
										</p>
										<p className="mt-1 text-xs text-muted-foreground">
											{t("shop_saved_saved_at", {
												date: new Date(entry.updatedAt).toLocaleString(),
											})}
										</p>
									</div>
									<div className="flex flex-wrap gap-2">
										<ButtonLink
											href={`/shop/${storeId}/p/${entry.productId}/customizer`}
										>
											{t("shop_saved_continue_customizing")}
										</ButtonLink>
										<button
											type="button"
											disabled={deletingId === entry.id}
											className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
											onClick={() => void handleDeleteCloud(entry.id)}
										>
											{t("shop_saved_remove")}
										</button>
									</div>
								</li>
							))}
						</ul>
					)
				) : localDesigns.length === 0 ? (
					<p className="flex items-center gap-2 text-sm text-muted-foreground">
						<IconPalette className="size-4" />
						{t("shop_saved_designs_empty")}
					</p>
				) : (
					<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{localDesigns.map((entry) => (
							<li
								key={entry.id}
								className="flex flex-col gap-3 rounded-lg border border-border/80 p-4"
							>
								<div className="min-w-0">
									<p className="font-medium leading-snug">
										{entry.productName}
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{t("shop_saved_saved_at", {
											date: new Date(entry.savedAt).toLocaleString(),
										})}
									</p>
								</div>
								<div className="flex flex-wrap gap-2">
									<ButtonLink
										href={`/shop/${storeId}/p/${entry.productId}/customizer`}
									>
										{t("shop_saved_continue_customizing")}
									</ButtonLink>
									<button
										type="button"
										className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
										onClick={() => removeLocal(entry.id)}
									>
										{t("shop_saved_remove")}
									</button>
								</div>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}

function ButtonLink({ href, children }: { href: string; children: ReactNode }) {
	return (
		<Link
			href={href}
			className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
		>
			{children}
		</Link>
	);
}
