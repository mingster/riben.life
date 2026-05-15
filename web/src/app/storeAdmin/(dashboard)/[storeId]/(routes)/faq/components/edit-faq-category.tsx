"use client";

import { deleteFaqCategoryLocaleAction } from "@/actions/storeAdmin/faqCategory/delete-faq-category-locale";
import { updateFaqCategoryAction } from "@/actions/storeAdmin/faqCategory/update-faq-category";
import {
	type UpdateFaqCategoryInput,
	updateFaqCategorySchema,
} from "@/actions/storeAdmin/faqCategory/update-faq-category.validation";
import { upsertFaqCategoryLocaleAction } from "@/actions/storeAdmin/faqCategory/upsert-faq-category-locale";
import { deleteFaqLocaleAction } from "@/actions/storeAdmin/faq/delete-faq-locale";
import { updateFaqAction } from "@/actions/storeAdmin/faq/update-faq";
import {
	type UpdateFaqInput,
	updateFaqSchema,
} from "@/actions/storeAdmin/faq/update-faq.validation";
import { upsertFaqLocaleAction } from "@/actions/storeAdmin/faq/upsert-faq-locale";
import { translateFaqContentAction } from "@/actions/storeAdmin/faq/translate-faq-content";
import { useTranslation } from "@/app/i18n/client";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/providers/i18n-provider";
import type { Faq, FaqCategory, FaqCategoryLocale, FaqLocale } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	IconLanguage,
	IconPencil,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import useSWR from "swr";
import { Plus } from "lucide-react";
import axios from "axios";

const EditorComp = dynamic(
	() => import("@/components/editor/EditorComponent"),
	{ ssr: false },
);

type LocaleRow = { id: string; name: string; lng: string };
const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ─── CategoryLocaleEditor ───────────────────────────────────────────────────

const CategoryLocaleEditor = ({
	categoryId,
	existing,
	usedLocaleIds,
	otherLocales,
	onSaved,
	onClose,
	storeId,
}: {
	categoryId: string;
	existing: FaqCategoryLocale | null;
	usedLocaleIds: string[];
	otherLocales: FaqCategoryLocale[];
	onSaved: (locale: FaqCategoryLocale) => void;
	onClose: () => void;
	storeId: string;
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [loading, setLoading] = useState(false);
	const [translating, setTranslating] = useState(false);
	const [localeId, setLocaleId] = useState(existing?.localeId ?? "");
	const [name, setName] = useState(existing?.name ?? "");
	const [sourceLocaleId, setSourceLocaleId] = useState(
		otherLocales[0]?.localeId ?? "",
	);

	const { data: allLocales = [] } = useSWR<LocaleRow[]>(
		`${process.env.NEXT_PUBLIC_API_URL}/common/get-locales`,
		fetcher,
	);
	const available = existing
		? allLocales
		: allLocales.filter((l) => !usedLocaleIds.includes(l.id));

	const handleTranslate = async () => {
		const source = otherLocales.find((l) => l.localeId === sourceLocaleId);
		if (!source) return;
		setTranslating(true);
		const result = await translateFaqContentAction(storeId, {
			text: source.name,
			sourceLocaleId: source.localeId,
			targetLocaleId: localeId,
		});
		if (result?.data) {
			setName(result.data.translatedText);
		} else {
			toastError({ description: result?.serverError ?? t("error") });
		}
		setTranslating(false);
	};

	const onSubmit = async () => {
		if (!localeId || !name.trim()) return;
		setLoading(true);
		const result = await upsertFaqCategoryLocaleAction(storeId, {
			categoryId,
			localeId,
			name,
		});
		if (result?.data) {
			onSaved(result.data);
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
					<label className="text-sm font-medium" htmlFor="cat-locale-select">
						{t("locale")}
					</label>
					<Select value={localeId} onValueChange={setLocaleId}>
						<SelectTrigger id="cat-locale-select">
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

			{otherLocales.length > 0 && localeId && (
				<div className="flex items-center gap-2">
					<Select value={sourceLocaleId} onValueChange={setSourceLocaleId}>
						<SelectTrigger className="h-8 flex-1 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{otherLocales.map((l) => (
								<SelectItem key={l.id} value={l.localeId}>
									{l.localeId.toUpperCase()}: {l.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						size="sm"
						variant="outline"
						onClick={handleTranslate}
						disabled={translating || !sourceLocaleId}
					>
						<IconLanguage className="mr-1 size-3.5" />
						{translating ? t("loading") : "AI"}
					</Button>
				</div>
			)}

			<div className="space-y-1.5">
				<label className="text-sm font-medium" htmlFor="cat-locale-name">
					{t("faq_category_name")}
				</label>
				<Input
					id="cat-locale-name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder={t("faq_category_name")}
					disabled={loading}
				/>
			</div>

			<div className="flex gap-2">
				<Button
					onClick={onSubmit}
					disabled={loading || !localeId || !name.trim()}
				>
					{t("save")}
				</Button>
				<Button variant="outline" onClick={onClose}>
					{t("cancel")}
				</Button>
			</div>
		</div>
	);
};

// ─── FaqLocaleEditor ─────────────────────────────────────────────────────────

const FaqLocaleEditor = ({
	faqId,
	storeId,
	existing,
	usedLocaleIds,
	otherLocales,
	onSaved,
	onClose,
}: {
	faqId: string;
	storeId: string;
	existing: FaqLocale | null;
	usedLocaleIds: string[];
	otherLocales: FaqLocale[];
	onSaved: (locale: FaqLocale) => void;
	onClose: () => void;
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [loading, setLoading] = useState(false);
	const [translating, setTranslating] = useState(false);
	const [localeId, setLocaleId] = useState(existing?.localeId ?? "");
	const [question, setQuestion] = useState(existing?.question ?? "");
	const [answer, setAnswer] = useState(existing?.answer ?? "");
	const [sourceLocaleId, setSourceLocaleId] = useState(
		otherLocales[0]?.localeId ?? "",
	);

	const { data: allLocales = [] } = useSWR<LocaleRow[]>(
		`${process.env.NEXT_PUBLIC_API_URL}/common/get-locales`,
		fetcher,
	);
	const available = existing
		? allLocales
		: allLocales.filter((l) => !usedLocaleIds.includes(l.id));

	const handleTranslate = async () => {
		const source = otherLocales.find((l) => l.localeId === sourceLocaleId);
		if (!source || !localeId) return;
		setTranslating(true);
		const [qResult, aResult] = await Promise.all([
			translateFaqContentAction(storeId, {
				text: source.question,
				sourceLocaleId: source.localeId,
				targetLocaleId: localeId,
			}),
			translateFaqContentAction(storeId, {
				text: source.answer,
				sourceLocaleId: source.localeId,
				targetLocaleId: localeId,
			}),
		]);
		if (qResult?.data) setQuestion(qResult.data.translatedText);
		if (aResult?.data) setAnswer(aResult.data.translatedText);
		if (!qResult?.data || !aResult?.data) {
			toastError({ description: t("error") });
		}
		setTranslating(false);
	};

	const onSubmit = async () => {
		if (!localeId || !question.trim() || !answer.trim()) return;
		setLoading(true);
		const result = await upsertFaqLocaleAction(storeId, {
			faqId,
			localeId,
			question,
			answer,
		});
		if (result?.data) {
			onSaved(result.data);
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
					<label className="text-sm font-medium" htmlFor="faq-locale-select">
						{t("locale")}
					</label>
					<Select value={localeId} onValueChange={setLocaleId}>
						<SelectTrigger id="faq-locale-select">
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

			{otherLocales.length > 0 && localeId && (
				<div className="flex items-center gap-2">
					<Select value={sourceLocaleId} onValueChange={setSourceLocaleId}>
						<SelectTrigger className="h-8 flex-1 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{otherLocales.map((l) => (
								<SelectItem key={l.id} value={l.localeId}>
									{l.localeId.toUpperCase()}: {l.question.slice(0, 40)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						size="sm"
						variant="outline"
						onClick={handleTranslate}
						disabled={translating || !sourceLocaleId}
					>
						<IconLanguage className="mr-1 size-3.5" />
						{translating ? t("loading") : "AI"}
					</Button>
				</div>
			)}

			<div className="space-y-1.5">
				<label className="text-sm font-medium" htmlFor="faq-question">
					{t("faq_question")}
				</label>
				<Input
					id="faq-question"
					value={question}
					onChange={(e) => setQuestion(e.target.value)}
					placeholder={t("faq_question")}
					disabled={loading}
				/>
			</div>
			<div className="space-y-1.5">
				<label className="text-sm font-medium" htmlFor="faq-answer">
					{t("faq_answer")}
				</label>
				<EditorComp markdown={answer} onPChange={setAnswer} />
			</div>

			<div className="flex gap-2">
				<Button
					onClick={onSubmit}
					disabled={loading || !localeId || !question.trim() || !answer.trim()}
				>
					{t("save")}
				</Button>
				<Button variant="outline" onClick={onClose}>
					{t("cancel")}
				</Button>
			</div>
		</div>
	);
};

// ─── FaqItemDialog ────────────────────────────────────────────────────────────

const FaqItemDialog = ({
	faq,
	storeId,
	categoryId,
	faqCount,
	onUpdated,
	onClose,
}: {
	faq: Faq | null;
	storeId: string;
	categoryId: string;
	faqCount: number;
	onUpdated: (faq: Faq) => void;
	onClose: () => void;
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const isNew = !faq || faq.id === "new";

	const [faqId, setFaqId] = useState(faq?.id ?? "new");
	const [faqLocales, setFaqLocales] = useState<FaqLocale[]>(faq?.locales ?? []);
	const [localeEditorOpen, setLocaleEditorOpen] = useState(false);
	const [editingLocale, setEditingLocale] = useState<FaqLocale | null>(null);
	const [deletingLocale, setDeletingLocale] = useState<FaqLocale | null>(null);

	const form = useForm<UpdateFaqInput>({
		resolver: zodResolver(updateFaqSchema) as Resolver<UpdateFaqInput>,
		defaultValues: {
			id: faq?.id ?? "new",
			categoryId,
			sortOrder: faq?.sortOrder ?? faqCount + 1,
			published: faq?.published ?? false,
		},
		mode: "onChange",
	});

	const onSubmit = async (data: UpdateFaqInput) => {
		const result = await updateFaqAction(storeId, data);
		if (result?.data) {
			const saved = result.data;
			setFaqId(saved.id);
			form.setValue("id", saved.id);
			onUpdated({ ...saved, locales: faqLocales });
			toastSuccess({
				description: isNew ? t("faq_created") : t("faq_updated"),
			});
		} else {
			toastError({ description: result?.serverError ?? t("error") });
		}
	};

	const handleLocaleSaved = (locale: FaqLocale) => {
		const updated = faqLocales.some((l) => l.id === locale.id)
			? faqLocales.map((l) => (l.id === locale.id ? locale : l))
			: [...faqLocales, locale];
		setFaqLocales(updated);
		onUpdated({ ...(faq ?? ({} as Faq)), id: faqId, locales: updated });
		setLocaleEditorOpen(false);
		setEditingLocale(null);
	};

	const handleLocaleDelete = async () => {
		if (!deletingLocale) return;
		const result = await deleteFaqLocaleAction(storeId, {
			id: deletingLocale.id,
		});
		if (result?.data) {
			const updated = faqLocales.filter((l) => l.id !== deletingLocale.id);
			setFaqLocales(updated);
			onUpdated({ ...(faq ?? ({} as Faq)), id: faqId, locales: updated });
			toastSuccess({ description: t("faq_deleted") });
		} else {
			toastError({ description: result?.serverError ?? t("error") });
		}
		setDeletingLocale(null);
	};

	return (
		<>
			<AlertModal
				isOpen={!!deletingLocale}
				onClose={() => setDeletingLocale(null)}
				onConfirm={handleLocaleDelete}
				loading={false}
			/>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
					<div className="grid grid-cols-2 gap-3">
						<FormField
							control={form.control}
							name="sortOrder"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("faq_category_sort_order")}</FormLabel>
									<FormControl>
										<Input
											type="number"
											disabled={form.formState.isSubmitting}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="published"
							render={({ field }) => (
								<FormItem className="flex items-center justify-between rounded-lg border p-3 mt-2">
									<FormLabel>{t("faq_published")}</FormLabel>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
					</div>
					<div className="flex gap-2">
						<Button
							type="submit"
							disabled={form.formState.isSubmitting || !form.formState.isValid}
						>
							{t("save")}
						</Button>
						<Button type="button" variant="outline" onClick={onClose}>
							{t("cancel")}
						</Button>
					</div>
				</form>
			</Form>

			{faqId !== "new" && (
				<>
					<Separator className="my-3" />
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">{t("locale")}</span>
							<Button
								size="sm"
								variant="outline"
								onClick={() => {
									setEditingLocale(null);
									setLocaleEditorOpen(true);
								}}
							>
								<IconPlus className="mr-1 size-3.5" />
								{t("faq_category_add_faq")}
							</Button>
						</div>
						{faqLocales.length === 0 && (
							<p className="text-sm text-muted-foreground">
								{t("faq_no_faqs")}
							</p>
						)}
						{faqLocales.map((locale) => (
							<div
								key={locale.id}
								className="flex items-center gap-2 rounded border p-2 text-sm"
							>
								<Badge variant="secondary">
									{locale.localeId.toUpperCase()}
								</Badge>
								<span className="flex-1 truncate text-muted-foreground">
									{locale.question}
								</span>
								<Button
									size="icon"
									variant="ghost"
									className="size-7"
									onClick={() => {
										setEditingLocale(locale);
										setLocaleEditorOpen(true);
									}}
								>
									<IconPencil className="size-3.5" />
								</Button>
								<Button
									size="icon"
									variant="ghost"
									className="size-7 text-destructive"
									onClick={() => setDeletingLocale(locale)}
								>
									<IconTrash className="size-3.5" />
								</Button>
							</div>
						))}
					</div>
				</>
			)}

			<Dialog open={localeEditorOpen} onOpenChange={setLocaleEditorOpen}>
				<DialogContent className="sm:max-w-[90%] max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>
							{editingLocale ? t("faq_edit") : t("faq_category_add_faq")}
						</DialogTitle>
					</DialogHeader>
					<FaqLocaleEditor
						faqId={faqId}
						storeId={storeId}
						existing={editingLocale}
						usedLocaleIds={faqLocales.map((l) => l.localeId)}
						otherLocales={
							editingLocale
								? faqLocales.filter((l) => l.id !== editingLocale.id)
								: faqLocales
						}
						onSaved={handleLocaleSaved}
						onClose={() => {
							setLocaleEditorOpen(false);
							setEditingLocale(null);
						}}
					/>
				</DialogContent>
			</Dialog>
		</>
	);
};

// ─── EditFaqCategory ──────────────────────────────────────────────────────────

interface Props {
	item: FaqCategory;
	onUpdated?: (val: FaqCategory) => void;
}

export const EditFaqCategory: React.FC<Props> = ({ item, onUpdated }) => {
	const isNew = item.id === "new";
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const params = useParams<{ storeId: string }>();
	const storeId = String(params.storeId);

	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [categoryId, setCategoryId] = useState(item.id);
	const [catLocales, setCatLocales] = useState<FaqCategoryLocale[]>(
		item.locales ?? [],
	);
	const [faqList, setFaqList] = useState<Faq[]>(item.FAQ ?? []);

	// Category locale editor state
	const [catLocaleEditorOpen, setCatLocaleEditorOpen] = useState(false);
	const [editingCatLocale, setEditingCatLocale] =
		useState<FaqCategoryLocale | null>(null);
	const [deletingCatLocale, setDeletingCatLocale] =
		useState<FaqCategoryLocale | null>(null);

	// FAQ editor state
	const [faqEditorOpen, setFaqEditorOpen] = useState(false);
	const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
	const [deletingFaq, setDeletingFaq] = useState<Faq | null>(null);
	const [deleteFaqLoading, setDeleteFaqLoading] = useState(false);

	const form = useForm<UpdateFaqCategoryInput>({
		resolver: zodResolver(
			updateFaqCategorySchema,
		) as Resolver<UpdateFaqCategoryInput>,
		defaultValues: {
			id: item.id,
			sortOrder: item.sortOrder,
			published: item.published,
		},
		mode: "onChange",
	});

	const primaryName =
		catLocales.find((l) => l.localeId === lng)?.name ??
		catLocales[0]?.name ??
		"—";

	// ── Category parent save ─────────────────────────────────────────────────

	const onSubmit = async (data: UpdateFaqCategoryInput) => {
		setLoading(true);
		const result = await updateFaqCategoryAction(storeId, data);
		if (result?.data) {
			const saved = result.data;
			setCategoryId(saved.id);
			form.setValue("id", saved.id);
			const full: FaqCategory = { ...saved, locales: catLocales, FAQ: faqList };
			onUpdated?.(full);
			toastSuccess({ description: isNew ? t("created") : t("updated") });
			if (isNew) setIsOpen(false);
		} else {
			toastError({ description: result?.serverError ?? t("error") });
		}
		setLoading(false);
	};

	// ── Category locale handlers ─────────────────────────────────────────────

	const handleCatLocaleSaved = (locale: FaqCategoryLocale) => {
		const updated = catLocales.some((l) => l.id === locale.id)
			? catLocales.map((l) => (l.id === locale.id ? locale : l))
			: [...catLocales, locale];
		setCatLocales(updated);
		onUpdated?.({ ...item, id: categoryId, locales: updated, FAQ: faqList });
		setCatLocaleEditorOpen(false);
		setEditingCatLocale(null);
	};

	const handleCatLocaleDelete = async () => {
		if (!deletingCatLocale) return;
		const result = await deleteFaqCategoryLocaleAction(storeId, {
			id: deletingCatLocale.id,
		});
		if (result?.data) {
			const updated = catLocales.filter((l) => l.id !== deletingCatLocale.id);
			setCatLocales(updated);
			onUpdated?.({ ...item, id: categoryId, locales: updated, FAQ: faqList });
			toastSuccess({ description: t("faq_deleted") });
		} else {
			toastError({ description: result?.serverError ?? t("error") });
		}
		setDeletingCatLocale(null);
	};

	// ── FAQ handlers ──────────────────────────────────────────────────────────

	const handleFaqUpdated = (faq: Faq) => {
		const updated = faqList.some((f) => f.id === faq.id)
			? faqList.map((f) => (f.id === faq.id ? faq : f))
			: [...faqList, faq];
		setFaqList(updated);
		onUpdated?.({ ...item, id: categoryId, locales: catLocales, FAQ: updated });
		setFaqEditorOpen(false);
		setEditingFaq(null);
	};

	const handleFaqDelete = async () => {
		if (!deletingFaq) return;
		setDeleteFaqLoading(true);
		try {
			await axios.delete(
				`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${storeId}/faq/${deletingFaq.id}`,
			);
			const updated = faqList.filter((f) => f.id !== deletingFaq.id);
			setFaqList(updated);
			onUpdated?.({
				...item,
				id: categoryId,
				locales: catLocales,
				FAQ: updated,
			});
			toastSuccess({ description: t("faq_deleted") });
		} catch {
			toastError({ description: t("faq_delete_failed") });
		} finally {
			setDeleteFaqLoading(false);
			setDeletingFaq(null);
		}
	};

	// ─────────────────────────────────────────────────────────────────────────

	return (
		<>
			<AlertModal
				isOpen={!!deletingCatLocale}
				onClose={() => setDeletingCatLocale(null)}
				onConfirm={handleCatLocaleDelete}
				loading={false}
			/>
			<AlertModal
				isOpen={!!deletingFaq}
				onClose={() => setDeletingFaq(null)}
				onConfirm={handleFaqDelete}
				loading={deleteFaqLoading}
			/>

			{/* ── Main category dialog ── */}
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogTrigger asChild>
					{isNew ? (
						<Button variant="outline">
							<Plus className="mr-1 size-4" />
							{t("create")}
						</Button>
					) : (
						<Button
							variant="link"
							className="text-foreground w-fit px-0 text-left"
						>
							{primaryName}
						</Button>
					)}
				</DialogTrigger>

				<DialogContent className="max-w-xl space-y-4 max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{t("faq_category")}</DialogTitle>
					</DialogHeader>

					{/* Category parent form */}
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
							<div className="grid grid-cols-2 gap-3">
								<FormField
									control={form.control}
									name="sortOrder"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("faq_category_sort_order")}{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													disabled={loading || form.formState.isSubmitting}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="published"
									render={({ field }) => (
										<FormItem className="flex items-center justify-between rounded-lg border p-3 mt-2">
											<FormLabel>{t("faq_published")}</FormLabel>
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</div>
							<div className="flex gap-2">
								<Button
									type="submit"
									disabled={
										loading ||
										!form.formState.isValid ||
										form.formState.isSubmitting
									}
								>
									{t("submit")}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsOpen(false)}
								>
									{t("cancel")}
								</Button>
							</div>
						</form>
					</Form>

					{!isNew && (
						<>
							{/* ── Category locale variants ── */}
							<Separator />
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">{t("locale")}</span>
									<Button
										size="sm"
										variant="outline"
										onClick={() => {
											setEditingCatLocale(null);
											setCatLocaleEditorOpen(true);
										}}
									>
										<IconPlus className="mr-1 size-3.5" />
										{t("faq_category_add_faq")}
									</Button>
								</div>
								{catLocales.length === 0 && (
									<p className="text-sm text-muted-foreground">
										{t("faq_no_faqs")}
									</p>
								)}
								{catLocales.map((locale) => (
									<div
										key={locale.id}
										className="flex items-center gap-2 rounded border p-2 text-sm"
									>
										<Badge variant="secondary">
											{locale.localeId.toUpperCase()}
										</Badge>
										<span className="flex-1 truncate text-muted-foreground">
											{locale.name}
										</span>
										<Button
											size="icon"
											variant="ghost"
											className="size-7"
											onClick={() => {
												setEditingCatLocale(locale);
												setCatLocaleEditorOpen(true);
											}}
										>
											<IconPencil className="size-3.5" />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											className="size-7 text-destructive"
											onClick={() => setDeletingCatLocale(locale)}
										>
											<IconTrash className="size-3.5" />
										</Button>
									</div>
								))}
							</div>

							{/* ── FAQ list ── */}
							<Separator />
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">{t("faq")}</span>
									<Button
										size="sm"
										variant="outline"
										onClick={() => {
											setEditingFaq(null);
											setFaqEditorOpen(true);
										}}
									>
										<IconPlus className="mr-1 size-3.5" />
										{t("faq_category_add_faq")}
									</Button>
								</div>
								{faqList.length === 0 && (
									<p className="text-sm text-muted-foreground">
										{t("faq_no_faqs")}
									</p>
								)}
								{faqList.map((faq) => {
									const faqName =
										faq.locales.find((l: FaqLocale) => l.localeId === lng)
											?.question ??
										faq.locales[0]?.question ??
										faq.id;
									return (
										<div
											key={faq.id}
											className="flex items-center gap-2 rounded border p-2 text-sm"
										>
											<div className="flex flex-1 items-center gap-1.5 min-w-0">
												{faq.locales.map((l: FaqLocale) => (
													<Badge
														key={l.id}
														variant="outline"
														className="shrink-0 text-xs"
													>
														{l.localeId.toUpperCase()}
													</Badge>
												))}
												<span className="truncate text-muted-foreground">
													{faqName}
												</span>
											</div>
											<Button
												size="icon"
												variant="ghost"
												className="size-7"
												onClick={() => {
													setEditingFaq(faq);
													setFaqEditorOpen(true);
												}}
											>
												<IconPencil className="size-3.5" />
											</Button>
											<Button
												size="icon"
												variant="ghost"
												className="size-7 text-destructive"
												onClick={() => setDeletingFaq(faq)}
											>
												<IconTrash className="size-3.5" />
											</Button>
										</div>
									);
								})}
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>

			{/* ── Category locale editor dialog ── */}
			<Dialog open={catLocaleEditorOpen} onOpenChange={setCatLocaleEditorOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>
							{editingCatLocale ? t("faq_edit") : t("faq_category_add_faq")}
						</DialogTitle>
					</DialogHeader>
					<CategoryLocaleEditor
						categoryId={categoryId}
						storeId={storeId}
						existing={editingCatLocale}
						usedLocaleIds={catLocales.map((l) => l.localeId)}
						otherLocales={
							editingCatLocale
								? catLocales.filter((l) => l.id !== editingCatLocale.id)
								: catLocales
						}
						onSaved={handleCatLocaleSaved}
						onClose={() => {
							setCatLocaleEditorOpen(false);
							setEditingCatLocale(null);
						}}
					/>
				</DialogContent>
			</Dialog>

			{/* ── FAQ editor dialog ── */}
			<Dialog open={faqEditorOpen} onOpenChange={setFaqEditorOpen}>
				<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>
							{editingFaq ? t("faq_edit") : t("faq_category_add_faq")}
						</DialogTitle>
					</DialogHeader>
					<FaqItemDialog
						faq={editingFaq}
						storeId={storeId}
						categoryId={categoryId}
						faqCount={faqList.length}
						onUpdated={handleFaqUpdated}
						onClose={() => {
							setFaqEditorOpen(false);
							setEditingFaq(null);
						}}
					/>
				</DialogContent>
			</Dialog>
		</>
	);
};
