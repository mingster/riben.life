"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import axios from "axios";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import useSWR from "swr";
import type { z } from "zod";
import { updateMessageTemplateAction } from "@/actions/sysAdmin/messageTemplate/update-message-template";
import {
	type UpdateMessageTemplateInput,
	updateMessageTemplateSchema,
} from "@/actions/sysAdmin/messageTemplate/update-message-template.validation";
import { updateMessageTemplateLocalizedAction } from "@/actions/sysAdmin/messageTemplateLocalized/update-message-template-localized";
import {
	type UpdateMessageTemplateLocalizedInput,
	updateMessageTemplateLocalizedSchema,
} from "@/actions/sysAdmin/messageTemplateLocalized/update-message-template-localized.validation";
import { useTranslation } from "@/app/i18n/client";
import { TemplateVariablePreview } from "@/components/notification/template-variable-preview";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { MessageTemplate, MessageTemplateLocalized } from "@/types";
import {
	formatSmsBodyLengthError,
	validateSmsBodyLength,
} from "@/utils/sms-body-length";

const EditorComp = dynamic(
	() => import("@/components/editor/EditorComponent"),
	{ ssr: false },
);

function validateTemplateSyntax(template: string): {
	valid: boolean;
	errors?: string[];
} {
	const errors: string[] = [];
	const openBraces = (template.match(/\{\{/g) || []).length;
	const closeBraces = (template.match(/\}\}/g) || []).length;
	if (openBraces !== closeBraces) {
		errors.push("Unclosed variable braces detected");
	}
	const matches = template.match(/\{\{[^}]+\}\}/g);
	if (matches) {
		for (const match of matches) {
			if (!/^\{\{\w+(?:\.\w+)*\}\}$/.test(match)) {
				errors.push(`Invalid variable syntax: ${match}`);
			}
		}
	}
	return {
		valid: errors.length === 0,
		errors: errors.length > 0 ? errors : undefined,
	};
}

type LocaleRow = { id: string; name: string; lng: string };
const fetcher = (url: string) => fetch(url).then((r) => r.json());

const LocaleForm = ({
	messageTemplateId,
	templateType,
	templateName,
	existing,
	usedLocaleIds,
	onSaved,
	onClose,
}: {
	messageTemplateId: string;
	templateType: string | null;
	templateName: string | null;
	existing: MessageTemplateLocalized | null;
	usedLocaleIds: string[];
	onSaved: (loc: MessageTemplateLocalized) => void;
	onClose: () => void;
}) => {
	const form = useForm<UpdateMessageTemplateLocalizedInput>({
		resolver: zodResolver(updateMessageTemplateLocalizedSchema),
		defaultValues: existing
			? {
					...existing,
					bCCEmailAddresses: existing.bCCEmailAddresses ?? undefined,
					translationStatus: existing.translationStatus || "draft",
					sourceLocaleId: existing.sourceLocaleId || null,
				}
			: {
					id: "new",
					messageTemplateId,
					localeId: "",
					subject: "",
					body: "",
					bCCEmailAddresses: "",
					isActive: true,
					translationStatus: "draft",
					sourceLocaleId: null,
				},
		mode: "onChange",
	});

	const { data: allLocales = [] } = useSWR<LocaleRow[]>(
		`${process.env.NEXT_PUBLIC_API_URL}/common/get-locales`,
		fetcher,
	);
	const available = existing
		? allLocales
		: allLocales.filter((l) => !usedLocaleIds.includes(l.lng));

	const bodyValue = form.watch("body");
	const subjectValue = form.watch("subject");
	const bodyValidation = validateTemplateSyntax(bodyValue || "");
	const subjectValidation = validateTemplateSyntax(subjectValue || "");
	const isSmsTemplate = templateType?.toLowerCase() === "sms";
	const smsBodyLength = isSmsTemplate
		? validateSmsBodyLength(bodyValue || "")
		: null;

	const onSubmit = async (data: UpdateMessageTemplateLocalizedInput) => {
		if (isSmsTemplate) {
			const smsError = formatSmsBodyLengthError(data.body || "");
			if (smsError) {
				toastError({ description: smsError });
				return;
			}
		}
		const result = await updateMessageTemplateLocalizedAction(data);
		if (result?.data) {
			onSaved({
				...result.data,
				bCCEmailAddresses: result.data.bCCEmailAddresses ?? null,
			} as MessageTemplateLocalized);
			toastSuccess({ description: "Saved." });
		} else {
			toastError({ description: result?.serverError ?? "Error" });
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
				{existing ? (
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium">Locale:</span>
						<Badge variant="secondary">{existing.localeId.toUpperCase()}</Badge>
					</div>
				) : (
					<FormField
						control={form.control}
						name="localeId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Locale</FormLabel>
								<FormControl>
									<Select
										value={field.value}
										onValueChange={field.onChange}
										disabled={form.formState.isSubmitting}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select locale" />
										</SelectTrigger>
										<SelectContent>
											{available.map((l) => (
												<SelectItem key={l.id} value={l.lng}>
													{l.name} ({l.lng.toUpperCase()})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}
				{(!bodyValidation.valid || !subjectValidation.valid) && (
					<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
						{!subjectValidation.valid && (
							<div>Invalid subject template syntax detected.</div>
						)}
						{!bodyValidation.valid && (
							<div>Invalid body template syntax detected.</div>
						)}
					</div>
				)}
				<FormField
					control={form.control}
					name="subject"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Subject</FormLabel>
							<FormControl>
								<Input
									disabled={form.formState.isSubmitting}
									placeholder="Subject"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="body"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Body</FormLabel>
							{isSmsTemplate && smsBodyLength && (
								<p className="text-xs font-mono text-gray-500">
									SMS body: {smsBodyLength.length}/{smsBodyLength.limit}{" "}
									characters
								</p>
							)}
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
								<div className="lg:col-span-2">
									<FormControl>
										<EditorComp
											markdown={field.value || ""}
											onPChange={field.onChange}
										/>
									</FormControl>
									<FormMessage />
								</div>
								<div className="lg:col-span-1">
									<TemplateVariablePreview
										messageTemplateName={templateName}
										onVariableSelect={(variable) =>
											field.onChange(`${field.value || ""}${variable}`)
										}
									/>
								</div>
							</div>
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="bCCEmailAddresses"
					render={({ field }) => (
						<FormItem>
							<FormLabel>BCC Email Addresses</FormLabel>
							<FormControl>
								<Input
									disabled={form.formState.isSubmitting}
									placeholder="BCC addresses"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="isActive"
					render={({ field }) => (
						<FormItem className="flex items-center justify-between rounded-lg border p-3">
							<FormLabel>Active</FormLabel>
							<FormControl>
								<Switch
									checked={field.value}
									onCheckedChange={field.onChange}
								/>
							</FormControl>
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="translationStatus"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Translation Status</FormLabel>
							<FormControl>
								<Select
									value={field.value || "draft"}
									onValueChange={field.onChange}
									disabled={form.formState.isSubmitting}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="draft">Draft</SelectItem>
										<SelectItem value="reviewed">Reviewed</SelectItem>
										<SelectItem value="approved">Approved</SelectItem>
									</SelectContent>
								</Select>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="flex gap-2">
					<Button
						type="submit"
						disabled={form.formState.isSubmitting || !form.formState.isValid}
					>
						Save
					</Button>
					<Button type="button" variant="outline" onClick={onClose}>
						Cancel
					</Button>
				</div>
			</form>
		</Form>
	);
};

interface Props {
	item: MessageTemplate;
	onUpdated?: (msg: MessageTemplate) => void;
	stores?: Array<{ id: string; name: string | null }>;
}

export const EditMessageTemplate: React.FC<Props> = ({
	item,
	onUpdated,
	stores = [],
}) => {
	const isNew = item.id === "new";
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [templateId, setTemplateId] = useState(item.id);
	const [localizedList, setLocalizedList] = useState<
		MessageTemplateLocalized[]
	>(item.MessageTemplateLocalized ?? []);
	const [localeEditorOpen, setLocaleEditorOpen] = useState(false);
	const [editingLocalized, setEditingLocalized] =
		useState<MessageTemplateLocalized | null>(null);
	const [deletingLocalized, setDeletingLocalized] =
		useState<MessageTemplateLocalized | null>(null);
	const [deleteLoading, setDeleteLoading] = useState(false);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const form = useForm<UpdateMessageTemplateInput>({
		resolver: zodResolver(
			updateMessageTemplateSchema,
		) as Resolver<UpdateMessageTemplateInput>,
		defaultValues: {
			id: item.id,
			name: item.name,
			templateType:
				(item.templateType as z.infer<
					typeof updateMessageTemplateSchema
				>["templateType"]) || "email",
			isGlobal: item.isGlobal ?? false,
			storeId: item.storeId || null,
		},
		mode: "onChange",
	});

	const currentTemplateType = form.watch("templateType");
	const currentTemplateName = form.watch("name");

	const onSubmit = async (data: UpdateMessageTemplateInput) => {
		if (data.storeId === "--Global--") data.storeId = null;
		setLoading(true);
		const result = await updateMessageTemplateAction(data);
		if (result?.data) {
			const saved = result.data;
			setTemplateId(saved.id);
			form.setValue("id", saved.id);
			onUpdated?.({
				...saved,
				MessageTemplateLocalized: localizedList,
			} as MessageTemplate);
			toastSuccess({ description: isNew ? "Created." : "Saved." });
			if (isNew) setIsOpen(false);
		} else {
			toastError({ description: result?.serverError ?? "Error" });
		}
		setLoading(false);
	};

	const handleLocalizedSaved = (loc: MessageTemplateLocalized) => {
		const updated = localizedList.some((l) => l.id === loc.id)
			? localizedList.map((l) => (l.id === loc.id ? loc : l))
			: [...localizedList, loc];
		setLocalizedList(updated);
		onUpdated?.({ ...item, id: templateId, MessageTemplateLocalized: updated });
		setLocaleEditorOpen(false);
		setEditingLocalized(null);
	};

	const handleLocalizedDelete = async () => {
		if (!deletingLocalized) return;
		setDeleteLoading(true);
		try {
			await axios.delete(
				`${process.env.NEXT_PUBLIC_API_URL}/sysAdmin/messageTemplateLocalized/${deletingLocalized.id}`,
			);
			const updated = localizedList.filter(
				(l) => l.id !== deletingLocalized.id,
			);
			setLocalizedList(updated);
			onUpdated?.({
				...item,
				id: templateId,
				MessageTemplateLocalized: updated,
			});
			toastSuccess({ description: "Deleted." });
		} catch {
			toastError({ description: "Delete failed." });
		} finally {
			setDeleteLoading(false);
			setDeletingLocalized(null);
		}
	};

	return (
		<>
			<AlertModal
				isOpen={!!deletingLocalized}
				onClose={() => setDeletingLocalized(null)}
				onConfirm={handleLocalizedDelete}
				loading={deleteLoading}
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
							{item.name}
						</Button>
					)}
				</DialogTrigger>

				<DialogContent className="max-w-lg space-y-4">
					<DialogHeader>
						<DialogTitle>
							{isNew ? "New message template" : "Edit message template"}
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
												placeholder="Template name"
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
								name="templateType"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Template Type</FormLabel>
										<FormControl>
											<Select
												disabled={loading}
												value={field.value}
												onValueChange={field.onChange}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select template type" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="email">Email</SelectItem>
													<SelectItem value="line">LINE</SelectItem>
													<SelectItem value="sms">SMS</SelectItem>
													<SelectItem value="whatsapp">WhatsApp</SelectItem>
													<SelectItem value="wechat">WeChat</SelectItem>
													<SelectItem value="telegram">Telegram</SelectItem>
													<SelectItem value="push">
														Push Notification
													</SelectItem>
													<SelectItem value="onsite">On-Site</SelectItem>
												</SelectContent>
											</Select>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="isGlobal"
								render={({ field }) => (
									<FormItem className="flex flex-row items-start space-x-3 space-y-0">
										<FormControl>
											<Checkbox
												checked={field.value}
												onCheckedChange={field.onChange}
												disabled={loading}
											/>
										</FormControl>
										<div className="space-y-1 leading-none">
											<FormLabel>Global Template</FormLabel>
										</div>
									</FormItem>
								)}
							/>
							{!form.watch("isGlobal") && (
								<FormField
									control={form.control}
									name="storeId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Store</FormLabel>
											<FormControl>
												<Select
													disabled={loading}
													value={field.value || ""}
													onValueChange={(v) => field.onChange(v || null)}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select a store (optional)" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="--Global--">
															None (Global)
														</SelectItem>
														{stores.map((store) => (
															<SelectItem key={store.id} value={store.id}>
																{store.name || store.id}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}
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
											setEditingLocalized(null);
											setLocaleEditorOpen(true);
										}}
									>
										<IconPlus className="mr-1 size-3.5" />
										Add locale
									</Button>
								</div>
								{localizedList.length === 0 && (
									<p className="text-sm text-muted-foreground">
										No locale variants yet.
									</p>
								)}
								{localizedList.map((loc) => (
									<div
										key={loc.id}
										className="flex items-center gap-2 rounded border p-2 text-sm"
									>
										<Badge variant="secondary">
											{loc.localeId.toUpperCase()}
										</Badge>
										<span className="flex-1 truncate text-muted-foreground">
											{loc.subject}
										</span>
										<Button
											size="icon"
											variant="ghost"
											className="size-7"
											onClick={() => {
												setEditingLocalized(loc);
												setLocaleEditorOpen(true);
											}}
										>
											<IconPencil className="size-3.5" />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											className="size-7 text-destructive"
											onClick={() => setDeletingLocalized(loc)}
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
				<DialogContent className="sm:max-w-[90%] max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>
							{editingLocalized ? "Edit locale variant" : "Add locale variant"}
						</DialogTitle>
					</DialogHeader>
					<LocaleForm
						messageTemplateId={templateId}
						templateType={currentTemplateType}
						templateName={currentTemplateName}
						existing={editingLocalized}
						usedLocaleIds={localizedList.map((l) => l.localeId)}
						onSaved={handleLocalizedSaved}
						onClose={() => {
							setLocaleEditorOpen(false);
							setEditingLocalized(null);
						}}
					/>
				</DialogContent>
			</Dialog>
		</>
	);
};
