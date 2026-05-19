"use client";

import { deleteProductLocaleAction } from "@/actions/storeAdmin/product/delete-product-locale";
import { upsertProductLocaleAction } from "@/actions/storeAdmin/product/upsert-product-locale";
import { translateFaqContentAction } from "@/actions/storeAdmin/faq/translate-faq-content";
import { useTranslation } from "@/app/i18n/client";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/providers/i18n-provider";
import { ChineseUtil } from "@/utils/chinese-util";
import {
	IconLanguage,
	IconPencil,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import type { ProductLocaleRow } from "@/actions/storeAdmin/storeAdmin/map-product-column";

type LocaleRow = { id: string; name: string; lng: string };
type LocalesApiResponse = { locales: LocaleRow[]; defaultLocaleId: string };
const fetcher = (url: string) => fetch(url).then((r) => r.json());
const isChinesePair = (a: string, b: string) =>
	(a === "tw" || a === "zh") && (b === "tw" || b === "zh");

interface LocaleEditorProps {
	storeId: string;
	productId: string;
	existing: ProductLocaleRow | null;
	usedLocaleIds: string[];
	existingLocales: ProductLocaleRow[];
	onSaved: (locale: ProductLocaleRow) => void;
	onClose: () => void;
	t: (key: string) => string;
}

function LocaleEditor({
	storeId,
	productId,
	existing,
	usedLocaleIds,
	existingLocales,
	onSaved,
	onClose,
	t,
}: LocaleEditorProps) {
	const [loading, setLoading] = useState(false);
	const [translating, setTranslating] = useState(false);
	const [localeId, setLocaleId] = useState(existing?.localeId ?? "");
	const [name, setName] = useState(existing?.name ?? "");

	const { data: localesData } = useSWR<LocalesApiResponse>(
		`${process.env.NEXT_PUBLIC_API_URL}/common/get-locales?storeId=${storeId}`,
		fetcher,
	);
	const allLocales = localesData?.locales ?? [];
	const defaultLocaleId = localesData?.defaultLocaleId ?? "";

	const available = existing
		? allLocales
		: allLocales.filter((l) => !usedLocaleIds.includes(l.id));

	const defaultLocale = allLocales.find((l) => l.id === defaultLocaleId);
	const sourceMessage =
		existingLocales.find((l) => l.localeId === defaultLocaleId)?.name ?? "";
	const targetLocale = allLocales.find((l) => l.id === localeId);
	const showTranslate =
		localeId !== defaultLocaleId && !!defaultLocaleId && !!sourceMessage;

	const handleTranslate = async () => {
		if (
			!sourceMessage ||
			!localeId ||
			!defaultLocale ||
			!targetLocale ||
			translating
		)
			return;
		setTranslating(true);
		try {
			if (isChinesePair(defaultLocale.lng, targetLocale.lng)) {
				const fn =
					defaultLocale.lng === "tw"
						? ChineseUtil.TraditionalToSimplify
						: ChineseUtil.SimplifyToTraditional;
				setName(fn(sourceMessage));
			} else {
				const result = await translateFaqContentAction(storeId, {
					text: sourceMessage,
					targetLocaleId: targetLocale.lng,
					sourceLocaleId: defaultLocale.lng,
				});
				if (result?.data?.translatedText) setName(result.data.translatedText);
				else if (result?.serverError)
					toastError({ description: result.serverError });
			}
		} finally {
			setTranslating(false);
		}
	};

	const onSubmit = async () => {
		if (!localeId || !name.trim()) return;
		setLoading(true);
		const result = await upsertProductLocaleAction(storeId, {
			productId,
			localeId,
			name,
		});
		if (result?.data) {
			onSaved({
				id: result.data.id,
				localeId: result.data.localeId,
				name: result.data.name,
			});
			toastSuccess({ description: t("saved") });
		} else {
			toastError({ description: result?.serverError ?? t("error") });
		}
		setLoading(false);
	};

	return (
		<div className="space-y-4">
			{existing ? (
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">{t("locale")}:</span>
					<Badge variant="secondary">{existing.localeId.toUpperCase()}</Badge>
				</div>
			) : (
				<div className="space-y-1.5">
					<label className="text-sm font-medium" htmlFor="locale-select">
						{t("locale")}
					</label>
					<Select value={localeId} onValueChange={setLocaleId}>
						<SelectTrigger id="locale-select">
							<SelectValue placeholder={t("select_locale")} />
						</SelectTrigger>
						<SelectContent>
							{available.map((l) => (
								<SelectItem key={l.id} value={l.id}>
									{l.name} ({l.id.toUpperCase()})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<label className="text-sm font-medium" htmlFor="locale-name">
						{t("product_name")}
					</label>
					{showTranslate && (
						<Button
							type="button"
							size="sm"
							variant="ghost"
							className="h-7 px-2 text-xs"
							disabled={translating || loading}
							onClick={handleTranslate}
						>
							<IconLanguage className="size-3.5 mr-1" />
							{t("translate")}
						</Button>
					)}
				</div>
				<Input
					id="locale-name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder={t("product_name")}
					disabled={loading || translating}
				/>
			</div>
			<div className="flex gap-2">
				<Button
					onClick={onSubmit}
					disabled={loading || translating || !localeId || !name.trim()}
				>
					{t("save")}
				</Button>
				<Button variant="outline" onClick={onClose}>
					{t("cancel")}
				</Button>
			</div>
		</div>
	);
}

interface ProductLocaleTabProps {
	productId: string;
	initialLocales: ProductLocaleRow[];
}

export function ProductLocaleTab({
	productId,
	initialLocales,
}: ProductLocaleTabProps) {
	const params = useParams<{ storeId: string }>();
	const storeId = String(params.storeId);
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [locales, setLocales] = useState<ProductLocaleRow[]>(initialLocales);
	const [editorOpen, setEditorOpen] = useState(false);
	const [editing, setEditing] = useState<ProductLocaleRow | null>(null);
	const [deleting, setDeleting] = useState<ProductLocaleRow | null>(null);

	const handleSaved = (locale: ProductLocaleRow) => {
		setLocales((prev) =>
			prev.some((l) => l.id === locale.id)
				? prev.map((l) => (l.id === locale.id ? locale : l))
				: [...prev, locale],
		);
		setEditorOpen(false);
		setEditing(null);
	};

	const handleDelete = async () => {
		if (!deleting) return;
		const result = await deleteProductLocaleAction(storeId, {
			id: deleting.id,
		});
		if (result?.data) {
			setLocales((prev) => prev.filter((l) => l.id !== deleting.id));
			toastSuccess({ description: t("deleted") });
		} else {
			toastError({ description: result?.serverError ?? t("error") });
		}
		setDeleting(null);
	};

	return (
		<>
			<AlertModal
				isOpen={!!deleting}
				onClose={() => setDeleting(null)}
				onConfirm={handleDelete}
				loading={false}
			/>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>{t("locale_variants")}</CardTitle>
						<Button
							size="sm"
							variant="outline"
							onClick={() => {
								setEditing(null);
								setEditorOpen(true);
							}}
						>
							<IconPlus className="mr-1 size-3.5" />
							{t("add_locale")}
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-2">
					{locales.length === 0 && (
						<p className="text-sm text-muted-foreground">
							{t("no_locale_variants")}
						</p>
					)}
					{locales.map((locale) => (
						<div
							key={locale.id}
							className="flex items-center gap-2 rounded border p-2 text-sm"
						>
							<Badge variant="secondary">{locale.localeId.toUpperCase()}</Badge>
							<span className="flex-1 truncate text-muted-foreground">
								{locale.name}
							</span>
							<Button
								size="icon"
								variant="ghost"
								className="size-7"
								onClick={() => {
									setEditing(locale);
									setEditorOpen(true);
								}}
							>
								<IconPencil className="size-3.5" />
							</Button>
							<Button
								size="icon"
								variant="ghost"
								className="size-7 text-destructive"
								onClick={() => setDeleting(locale)}
							>
								<IconTrash className="size-3.5" />
							</Button>
						</div>
					))}
				</CardContent>
			</Card>

			<Dialog open={editorOpen} onOpenChange={setEditorOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>
							{editing ? t("edit_locale_variant") : t("add_locale_variant")}
						</DialogTitle>
					</DialogHeader>
					<LocaleEditor
						storeId={storeId}
						productId={productId}
						existing={editing}
						usedLocaleIds={locales.map((l) => l.localeId)}
						existingLocales={locales}
						onSaved={handleSaved}
						onClose={() => {
							setEditorOpen(false);
							setEditing(null);
						}}
						t={t}
					/>
				</DialogContent>
			</Dialog>
		</>
	);
}
