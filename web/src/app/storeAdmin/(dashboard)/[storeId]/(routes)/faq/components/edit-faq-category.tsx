"use client";

import { deleteFaqCategoryLocaleAction } from "@/actions/storeAdmin/faqCategory/delete-faq-category-locale";
import { updateFaqCategoryAction } from "@/actions/storeAdmin/faqCategory/update-faq-category";
import {
	type UpdateFaqCategoryInput,
	updateFaqCategorySchema,
} from "@/actions/storeAdmin/faqCategory/update-faq-category.validation";
import { updateFaqAction } from "@/actions/storeAdmin/faq/update-faq";
import {
	type UpdateFaqInput,
	updateFaqSchema,
} from "@/actions/storeAdmin/faq/update-faq.validation";
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
import { useEffect, useState } from "react";
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

// ─── FaqItemDialog ────────────────────────────────────────────────────────────

const FaqItemDialog = ({
	faq,
	storeId,
	categoryId,
	faqCount,
	allCategories,
	onUpdated,
	onClose,
}: {
	faq: Faq | null;
	storeId: string;
	categoryId: string;
	faqCount: number;
	allCategories: FaqCategory[];
	onUpdated: (faq: Faq) => void;
	onClose: () => void;
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [loading, setLoading] = useState(false);

	const { data: allLocales = [] } = useSWR<LocaleRow[]>(
		`${process.env.NEXT_PUBLIC_API_URL}/common/get-locales`,
		fetcher,
	);

	const isNew = !faq || faq.id === "new";

	const form = useForm<UpdateFaqInput>({
		resolver: zodResolver(updateFaqSchema) as Resolver<UpdateFaqInput>,
		defaultValues: {
			id: faq?.id ?? "new",
			categoryId,
			sortOrder: faq?.sortOrder ?? faqCount + 1,
			published: faq?.published ?? false,
			locales: allLocales.reduce(
				(acc, l) => ({
					...acc,
					[l.id]: {
						question:
							faq?.locales.find((loc: FaqLocale) => loc.localeId === l.id)
								?.question ?? "",
						answer:
							faq?.locales.find((loc: FaqLocale) => loc.localeId === l.id)
								?.answer ?? "",
					},
				}),
				{},
			),
		},
		mode: "onChange",
	});

	useEffect(() => {
		if (allLocales.length > 0) {
			form.reset({
				id: faq?.id ?? "new",
				categoryId,
				sortOrder: faq?.sortOrder ?? faqCount + 1,
				published: faq?.published ?? false,
				locales: allLocales.reduce(
					(acc, l) => ({
						...acc,
						[l.id]: {
							question:
								faq?.locales.find((loc: FaqLocale) => loc.localeId === l.id)
									?.question ?? "",
							answer:
								faq?.locales.find((loc: FaqLocale) => loc.localeId === l.id)
									?.answer ?? "",
						},
					}),
					{},
				),
			});
		}
	}, [allLocales, faq, categoryId, faqCount, form]);

	const onSubmit = async (data: UpdateFaqInput) => {
		setLoading(true);
		const result = await updateFaqAction(storeId, data);
		if (result?.data) {
			onUpdated(result.data);
			toastSuccess({
				description: isNew ? t("faq_created") : t("faq_updated"),
			});
			onClose();
		} else {
			toastError({ description: result?.serverError ?? t("error") });
		}
		setLoading(false);
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<div className="space-y-6">
					{allLocales.map((locale) => (
						<div key={locale.id} className="rounded-lg border p-4 space-y-4">
							<div className="flex items-center gap-2 border-b pb-2">
								<Badge variant="outline">{locale.id.toUpperCase()}</Badge>
								<span className="text-sm font-semibold">{locale.name}</span>
							</div>

							<FormField
								control={form.control}
								name={`locales.${locale.id}.question`}
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("faq_question")}</FormLabel>
										<FormControl>
											<Input
												disabled={loading}
												placeholder={t("faq_question")}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name={`locales.${locale.id}.answer`}
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("faq_answer")}</FormLabel>
										<FormControl>
											<EditorComp
												markdown={field.value}
												onPChange={field.onChange}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					))}
				</div>

				{!isNew && allCategories.length > 0 && (
					<FormField
						control={form.control}
						name="categoryId"
						render={({ field }) => (
							<FormItem className="pt-4 border-t">
								<FormLabel>{t("faq_move_to_category")}</FormLabel>
								<Select value={field.value} onValueChange={field.onChange}>
									<FormControl>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{allCategories.map((cat) => {
											const name =
												cat.locales.find(
													(l: FaqCategoryLocale) => l.localeId === lng,
												)?.name ??
												cat.locales[0]?.name ??
												cat.id;
											return (
												<SelectItem key={cat.id} value={cat.id}>
													{name}
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				<div className="grid grid-cols-2 gap-4 pt-4 border-t">
					<FormField
						control={form.control}
						name="sortOrder"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("faq_category_sort_order")}</FormLabel>
								<FormControl>
									<Input type="number" disabled={loading} {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="published"
						render={({ field }) => (
							<FormItem className="flex items-center justify-between rounded-lg border p-3 mt-4">
								<FormLabel>{t("faq_published")}</FormLabel>
								<FormControl>
									<Switch
										checked={field.value}
										onCheckedChange={field.onChange}
										disabled={loading}
									/>
								</FormControl>
							</FormItem>
						)}
					/>
				</div>

				<div className="flex gap-2 pt-4">
					<Button
						type="submit"
						disabled={loading || !form.formState.isValid}
						className="flex-1"
					>
						{t("save")}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						disabled={loading}
					>
						{t("cancel")}
					</Button>
				</div>
			</form>
		</Form>
	);
};

// ─── EditFaqCategory ──────────────────────────────────────────────────────────

interface Props {
	item: FaqCategory;
	allCategories?: FaqCategory[];
	onUpdated?: (val: FaqCategory) => void;
}

export const EditFaqCategory: React.FC<Props> = ({
	item,
	allCategories = [],
	onUpdated,
}) => {
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

	// FAQ editor state
	const [faqEditorOpen, setFaqEditorOpen] = useState(false);
	const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
	const [deletingFaq, setDeletingFaq] = useState<Faq | null>(null);
	const [deleteFaqLoading, setDeleteFaqLoading] = useState(false);

	const { data: allLocales = [] } = useSWR<LocaleRow[]>(
		`${process.env.NEXT_PUBLIC_API_URL}/common/get-locales`,
		fetcher,
	);

	const form = useForm<UpdateFaqCategoryInput>({
		resolver: zodResolver(
			updateFaqCategorySchema,
		) as Resolver<UpdateFaqCategoryInput>,
		defaultValues: {
			id: item.id,
			sortOrder: item.sortOrder,
			published: item.published,
			locales: allLocales.reduce(
				(acc, l) => ({
					...acc,
					[l.id]:
						item.locales.find((loc: FaqCategoryLocale) => loc.localeId === l.id)
							?.name ?? "",
				}),
				{},
			),
		},
		mode: "onChange",
	});

	// Update form default values when allLocales are loaded
	useEffect(() => {
		if (allLocales.length > 0) {
			form.reset({
				id: item.id,
				sortOrder: item.sortOrder,
				published: item.published,
				locales: allLocales.reduce(
					(acc, l) => ({
						...acc,
						[l.id]:
							item.locales.find(
								(loc: FaqCategoryLocale) => loc.localeId === l.id,
							)?.name ?? "",
					}),
					{},
				),
			});
		}
	}, [allLocales, item, form]);

	const primaryName =
		catLocales.find((l: FaqCategoryLocale) => l.localeId === lng)?.name ??
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
			setCatLocales(saved.locales);
			const full: FaqCategory = { ...saved, FAQ: faqList };
			onUpdated?.(full);
			toastSuccess({ description: isNew ? t("created") : t("updated") });
			if (isNew) setIsOpen(false);
		} else {
			toastError({ description: result?.serverError ?? t("error") });
		}
		setLoading(false);
	};

	// ── Category locale handlers ─────────────────────────────────────────────

	const handleCatLocaleDelete = async (locale: FaqCategoryLocale) => {
		const result = await deleteFaqCategoryLocaleAction(storeId, {
			id: locale.id,
		});
		if (result?.data) {
			const updated = catLocales.filter((l) => l.id !== locale.id);
			setCatLocales(updated);
			onUpdated?.({ ...item, id: categoryId, locales: updated, FAQ: faqList });
			toastSuccess({ description: t("faq_deleted") });
		} else {
			toastError({ description: result?.serverError ?? t("error") });
		}
	};

	// ── FAQ handlers ──────────────────────────────────────────────────────────

	const handleFaqUpdated = (faq: Faq) => {
		let updated: Faq[];
		if (faq.categoryId !== categoryId) {
			updated = faqList.filter((f) => f.id !== faq.id);
			toastSuccess({ description: t("faq_moved") });
		} else {
			updated = faqList.some((f) => f.id === faq.id)
				? faqList.map((f) => (f.id === faq.id ? faq : f))
				: [...faqList, faq];
		}
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

				<DialogContent className="sm:max-w-4xl space-y-4 max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{t("faq_category")}</DialogTitle>
					</DialogHeader>

					{/* Category parent form */}
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								{allLocales.map((locale) => (
									<FormField
										key={locale.id}
										control={form.control}
										name={`locales.${locale.id}`}
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t("faq_category_name")} ({locale.name})
												</FormLabel>
												<FormControl>
													<Input
														disabled={loading || form.formState.isSubmitting}
														className="touch-manipulation"
														placeholder={`${t("input_placeholder_1")}${t("faq_category_name")} (${locale.name})`}
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								))}
							</div>

							<div className="grid grid-cols-2 gap-3 border-t pt-3">
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

			{/* ── FAQ editor dialog ── */}
			<Dialog open={faqEditorOpen} onOpenChange={setFaqEditorOpen}>
				<DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
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
						allCategories={allCategories}
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
