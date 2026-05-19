"use client";

import { deleteAnnouncementLocaleAction } from "@/actions/storeAdmin/announcements/delete-announcement-locale";
import { createAnnouncementAction } from "@/actions/storeAdmin/announcements/create-announcement";
import { updateAnnouncementAction } from "@/actions/storeAdmin/announcements/update-announcement";
import {
	type UpdateAnnouncementInput,
	updateAnnouncementSchema,
} from "@/actions/storeAdmin/announcements/update-announcement.validation";
import { upsertAnnouncementLocaleAction } from "@/actions/storeAdmin/announcements/upsert-announcement-locale";
import { translateFaqContentAction } from "@/actions/storeAdmin/faq/translate-faq-content";
import { useTranslation } from "@/app/i18n/client";
import { MarkdownMdxEditor } from "@/components/editor/markdown-mdx-editor";
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
import { useI18n } from "@/providers/i18n-provider";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChineseUtil } from "@/utils/chinese-util";
import {
	IconLanguage,
	IconPencil,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import type { StoreAnnouncementLocale } from "@prisma/client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import useSWR from "swr";
import type { AnnouncementColumn } from "../announcement-column";

type LocaleRow = { id: string; name: string; lng: string };
type LocalesApiResponse = { locales: LocaleRow[]; defaultLocaleId: string };
const fetcher = (url: string) => fetch(url).then((r) => r.json());
const isChinesePair = (a: string, b: string) =>
	(a === "tw" || a === "zh") && (b === "tw" || b === "zh");

const LocaleEditorDialog = ({
	storeId,
	messageId,
	existing,
	usedLocaleIds,
	existingLocales,
	onSaved,
	onClose,
	t,
}: {
	storeId: string;
	messageId: string;
	existing: StoreAnnouncementLocale | null;
	usedLocaleIds: string[];
	existingLocales: StoreAnnouncementLocale[];
	onSaved: (locale: StoreAnnouncementLocale) => void;
	onClose: () => void;
	t: (key: string) => string;
}) => {
	const [loading, setLoading] = useState(false);
	const [translating, setTranslating] = useState(false);
	const [localeId, setLocaleId] = useState(existing?.localeId ?? "");
	const [message, setMessage] = useState(existing?.message ?? "");

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
		existingLocales.find((l) => l.localeId === defaultLocaleId)?.message ?? "";
	const targetLocale = allLocales.find((l) => l.id === localeId);

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
				setMessage(fn(sourceMessage));
			} else {
				const result = await translateFaqContentAction(storeId, {
					text: sourceMessage,
					targetLocaleId: targetLocale.lng,
					sourceLocaleId: defaultLocale.lng,
				});
				if (result?.data?.translatedText)
					setMessage(result.data.translatedText);
				else if (result?.serverError)
					toastError({ description: result.serverError });
			}
		} finally {
			setTranslating(false);
		}
	};

	const showTranslate =
		localeId !== defaultLocaleId && !!defaultLocaleId && !!sourceMessage;

	const onSubmit = async () => {
		if (!localeId || !message.trim()) return;
		setLoading(true);
		const result = await upsertAnnouncementLocaleAction(storeId, {
			messageId,
			localeId,
			message,
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
					<label className="text-sm font-medium" htmlFor="locale-message">
						{t("message")}
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
				<MarkdownMdxEditor
					value={message}
					onChange={setMessage}
					name="locale-message"
					disabled={loading || translating}
					minHeight={200}
					placeholder={t("announcement_message_placeholder")}
				/>
			</div>
			<div className="flex gap-2">
				<Button
					onClick={onSubmit}
					disabled={loading || translating || !localeId || !message.trim()}
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

interface EditAnnouncementDialogProps {
	item: AnnouncementColumn;
	onUpdated?: (announcement: AnnouncementColumn) => void;
}

export function EditAnnouncementDialog({
	item,
	onUpdated,
}: EditAnnouncementDialogProps) {
	const isNew = item.id === "new";
	const params = useParams<{ storeId: string }>();
	const storeId = String(params.storeId);

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [msgId, setMsgId] = useState(item.id);
	const [locales, setLocales] = useState<StoreAnnouncementLocale[]>(
		item.locales ?? [],
	);
	const [localeEditorOpen, setLocaleEditorOpen] = useState(false);
	const [editingLocale, setEditingLocale] =
		useState<StoreAnnouncementLocale | null>(null);
	const [deletingLocale, setDeletingLocale] =
		useState<StoreAnnouncementLocale | null>(null);

	const form = useForm<UpdateAnnouncementInput>({
		resolver: zodResolver(
			updateAnnouncementSchema,
		) as Resolver<UpdateAnnouncementInput>,
		defaultValues: {
			id: item.id,
			name: item.name ?? "",
			published: item.published,
		},
		mode: "onChange",
	});

	const onSubmit = async (data: UpdateAnnouncementInput) => {
		setLoading(true);
		try {
			if (isNew) {
				const result = await createAnnouncementAction(storeId, {
					name: data.name,
					published: data.published,
				});
				if (result?.data) {
					const saved = result.data.announcement;
					setMsgId(saved.id);
					form.setValue("id", saved.id);
					const col: AnnouncementColumn = {
						id: saved.id,
						storeId,
						name: saved.name ?? null,
						published: saved.published,
						locales: saved.locales,
						updatedAt: "",
						createdAt: "",
						updatedAtIso: "",
						createdAtIso: "",
					};
					onUpdated?.(col);
					toastSuccess({ description: t("created") });
					setIsOpen(false);
				} else {
					toastError({ description: result?.serverError ?? t("error") });
				}
			} else {
				const result = await updateAnnouncementAction(storeId, {
					id: data.id,
					name: data.name,
					published: data.published,
				});
				if (result?.data) {
					const saved = result.data.announcement;
					const col: AnnouncementColumn = {
						id: saved.id,
						storeId,
						name: saved.name ?? null,
						published: saved.published,
						locales: saved.locales,
						updatedAt: "",
						createdAt: "",
						updatedAtIso: "",
						createdAtIso: "",
					};
					onUpdated?.(col);
					toastSuccess({ description: t("saved") });
				} else {
					toastError({ description: result?.serverError ?? t("error") });
				}
			}
		} finally {
			setLoading(false);
		}
	};

	const handleLocaleSaved = (locale: StoreAnnouncementLocale) => {
		const updated = locales.some((l) => l.id === locale.id)
			? locales.map((l) => (l.id === locale.id ? locale : l))
			: [...locales, locale];
		setLocales(updated);
		onUpdated?.({ ...item, id: msgId, locales: updated });
		setLocaleEditorOpen(false);
		setEditingLocale(null);
	};

	const handleLocaleDelete = async () => {
		if (!deletingLocale) return;
		const result = await deleteAnnouncementLocaleAction(storeId, {
			id: deletingLocale.id,
		});
		if (result?.data) {
			const updated = locales.filter((l) => l.id !== deletingLocale.id);
			setLocales(updated);
			onUpdated?.({ ...item, id: msgId, locales: updated });
			toastSuccess({ description: t("deleted") });
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

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogTrigger asChild>
					{isNew ? (
						<Button variant="outline">
							<IconPlus className="mr-1 size-4" />
							{t("create")}
						</Button>
					) : (
						<Button
							variant="link"
							className="text-foreground w-fit px-0 text-left"
						>
							{item.name || item.id}
						</Button>
					)}
				</DialogTrigger>

				<DialogContent className="max-w-lg space-y-4">
					<DialogHeader>
						<DialogTitle>
							{isNew
								? t("announcement") + t("create")
								: t("announcement") + t("edit")}
						</DialogTitle>
					</DialogHeader>

					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("name")}</FormLabel>
										<FormControl>
											<Input
												placeholder={
													t("announcement_name_placeholder") ?? "Internal name"
												}
												disabled={loading}
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
									<FormItem className="flex items-center justify-between rounded-lg border p-3">
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
							<div className="flex gap-2">
								<Button
									type="submit"
									disabled={loading || form.formState.isSubmitting}
								>
									{t("save")}
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
							<Separator />
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">
										{t("locale_variants")}
									</span>
									<Button
										size="sm"
										variant="outline"
										onClick={() => {
											setEditingLocale(null);
											setLocaleEditorOpen(true);
										}}
									>
										<IconPlus className="mr-1 size-3.5" />
										{t("add_locale")}
									</Button>
								</div>
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
										<Badge variant="secondary">
											{locale.localeId.toUpperCase()}
										</Badge>
										<span className="flex-1 truncate text-muted-foreground">
											{locale.message}
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
				</DialogContent>
			</Dialog>

			<Dialog open={localeEditorOpen} onOpenChange={setLocaleEditorOpen}>
				<DialogContent className="max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>
							{editingLocale
								? t("edit_locale_variant")
								: t("add_locale_variant")}
						</DialogTitle>
					</DialogHeader>
					<LocaleEditorDialog
						storeId={storeId}
						messageId={msgId}
						existing={editingLocale}
						usedLocaleIds={locales.map((l) => l.localeId)}
						existingLocales={locales}
						onSaved={handleLocaleSaved}
						onClose={() => {
							setLocaleEditorOpen(false);
							setEditingLocale(null);
						}}
						t={t}
					/>
				</DialogContent>
			</Dialog>
		</>
	);
}

export default EditAnnouncementDialog;
