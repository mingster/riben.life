"use client";

import { deleteSystemMessageLocaleAction } from "@/actions/sysAdmin/systemMessage/delete-system-message-locale";
import { updateSystemMessageAction } from "@/actions/sysAdmin/systemMessage/update-system-message";
import {
	type UpdateSystemMessageInput,
	updateSystemMessageSchema,
} from "@/actions/sysAdmin/systemMessage/update-system-message.validation";
import { upsertSystemMessageLocaleAction } from "@/actions/sysAdmin/systemMessage/upsert-system-message-locale";
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
import type { SystemMessage, SystemMessageLocale } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import useSWR from "swr";

interface Props {
	item: SystemMessage;
	onUpdated?: (msg: SystemMessage) => void;
}

type LocaleRow = { id: string; name: string; lng: string };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const LocaleEditorDialog = ({
	messageId,
	existing,
	usedLocaleIds,
	onSaved,
	onClose,
}: {
	messageId: string;
	existing: SystemMessageLocale | null;
	usedLocaleIds: string[];
	onSaved: (locale: SystemMessageLocale) => void;
	onClose: () => void;
}) => {
	const [loading, setLoading] = useState(false);
	const [localeId, setLocaleId] = useState(existing?.localeId ?? "");
	const [message, setMessage] = useState(existing?.message ?? "");

	const { data: allLocales = [] } = useSWR<LocaleRow[]>(
		`${process.env.NEXT_PUBLIC_API_URL}/common/get-locales`,
		fetcher,
	);
	const available = existing
		? allLocales
		: allLocales.filter((l) => !usedLocaleIds.includes(l.id));

	const onSubmit = async () => {
		if (!localeId || !message.trim()) return;
		setLoading(true);
		const result = await upsertSystemMessageLocaleAction({
			messageId,
			localeId,
			message,
		});
		if (result?.data) {
			onSaved(result.data);
			toastSuccess({ description: "Saved." });
		} else {
			toastError({ description: result?.serverError ?? "Error" });
		}
		setLoading(false);
	};

	return (
		<div className="space-y-4">
			{existing ? (
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">Locale:</span>
					<Badge variant="secondary">{existing.localeId.toUpperCase()}</Badge>
				</div>
			) : (
				<div className="space-y-1.5">
					<label className="text-sm font-medium" htmlFor="locale-select">
						Locale
					</label>
					<Select value={localeId} onValueChange={setLocaleId}>
						<SelectTrigger id="locale-select">
							<SelectValue placeholder="Select locale" />
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
				<label className="text-sm font-medium" htmlFor="locale-message">
					Message
				</label>
				<Textarea
					id="locale-message"
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					placeholder="Enter the message"
					rows={3}
					disabled={loading}
				/>
			</div>
			<div className="flex gap-2">
				<Button
					onClick={onSubmit}
					disabled={loading || !localeId || !message.trim()}
				>
					Save
				</Button>
				<Button variant="outline" onClick={onClose}>
					Cancel
				</Button>
			</div>
		</div>
	);
};

export const EditSystemMessage: React.FC<Props> = ({ item, onUpdated }) => {
	const isNew = item.id === "new";
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [msgId, setMsgId] = useState(item.id);
	const [locales, setLocales] = useState<SystemMessageLocale[]>(
		item.locales ?? [],
	);
	const [localeEditorOpen, setLocaleEditorOpen] = useState(false);
	const [editingLocale, setEditingLocale] =
		useState<SystemMessageLocale | null>(null);
	const [deletingLocale, setDeletingLocale] =
		useState<SystemMessageLocale | null>(null);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const form = useForm<UpdateSystemMessageInput>({
		resolver: zodResolver(updateSystemMessageSchema),
		defaultValues: {
			id: item.id,
			name: item.name ?? "",
			published: item.published,
		},
		mode: "onChange",
	});

	const onSubmit = async (data: UpdateSystemMessageInput) => {
		setLoading(true);
		const result = await updateSystemMessageAction(data);
		if (result?.data) {
			const saved = result.data;
			setMsgId(saved.id);
			form.setValue("id", saved.id);
			onUpdated?.(saved);
			toastSuccess({ description: "Saved." });
			if (isNew) setIsOpen(false);
		} else {
			toastError({ description: result?.serverError ?? "Error" });
		}
		setLoading(false);
	};

	const handleLocaleSaved = (locale: SystemMessageLocale) => {
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
		const result = await deleteSystemMessageLocaleAction({
			id: deletingLocale.id,
		});
		if (result?.data) {
			const updated = locales.filter((l) => l.id !== deletingLocale.id);
			setLocales(updated);
			onUpdated?.({ ...item, id: msgId, locales: updated });
			toastSuccess({ description: "Deleted." });
		} else {
			toastError({ description: result?.serverError ?? "Error" });
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
							{isNew ? "New system message" : "Edit system message"}
						</DialogTitle>
					</DialogHeader>

					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input
												placeholder="Internal name"
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
										<FormLabel>Published</FormLabel>
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
							<Separator />
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium">Locale variants</span>
									<Button
										size="sm"
										variant="outline"
										onClick={() => {
											setEditingLocale(null);
											setLocaleEditorOpen(true);
										}}
									>
										<IconPlus className="mr-1 size-3.5" />
										Add locale
									</Button>
								</div>
								{locales.length === 0 && (
									<p className="text-sm text-muted-foreground">
										No locale variants yet.
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
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>
							{editingLocale ? "Edit locale variant" : "Add locale variant"}
						</DialogTitle>
					</DialogHeader>
					<LocaleEditorDialog
						messageId={msgId}
						existing={editingLocale}
						usedLocaleIds={locales.map((l) => l.localeId)}
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

export default EditSystemMessage;
