"use client";

import {
	IconCheck,
	IconCopy,
	IconDots,
	IconTrash,
	IconX,
} from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import axios, { type AxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import type { z } from "zod";
import type { updateMessageTemplateLocalizedSchema } from "@/actions/sysAdmin/messageTemplateLocalized/update-message-template-localized.validation";
import { useTranslation } from "@/app/i18n/client";
import { DataTable } from "@/components/dataTable";
import { DataTableColumnHeader } from "@/components/dataTable-column-header";
import { Heading } from "@/components/heading";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	LIFECYCLE_CHANNELS,
	LIFECYCLE_RECIPIENTS,
	ORDER_LIFECYCLE_EVENTS,
	RESERVATION_LIFECYCLE_EVENTS,
	SUBSCRIPTION_LIFECYCLE_EVENTS,
} from "@/lib/notification/lifecycle-events";
import { parseLifecycleTemplateKey } from "@/lib/notification/template-registry";
import { useI18n } from "@/providers/i18n-provider";
import type {
	Locale,
	MessageTemplate,
	MessageTemplateLocalized,
} from "@/types";
import { EditMessageTemplate } from "./edit-message-template";
import { EditMessageTemplateLocalized } from "./edit-message-template-localized";
import logger from "@/lib/logger";

interface props {
	storeId: string;
	serverData: MessageTemplate[];
	messageTemplateLocalized: MessageTemplateLocalized[];
	locales: Locale[];
}

interface CellActionProps {
	item: MessageTemplate;
	onUpdated?: (newValue: MessageTemplate) => void;
}

const allLocaleId = "--";
const allTemplateType = "--";
const allScope = "--"; // "--" = all, "global" = global only, "store" = store only

export const MessageTemplateClient: React.FC<props> = ({
	storeId,
	serverData,
	messageTemplateLocalized,
	locales,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [messageTemplateData, setMessageTemplateData] =
		useState<MessageTemplate[]>(serverData);

	const [messageTemplateLocalizedData, setMessageTemplateLocalizedData] =
		useState<MessageTemplateLocalized[]>(messageTemplateLocalized);

	const [localeIdFilter, setLocaleIdFilter] = useState<string>("");
	const [templateTypeFilter, setTemplateTypeFilter] = useState<string>("");
	const [scopeFilter, setScopeFilter] = useState<string>(""); // "global" or "store" or "--" for all
	const [lifecycleDomainFilter, setLifecycleDomainFilter] =
		useState<string>(allLocaleId);
	const [lifecycleEventFilter, setLifecycleEventFilter] =
		useState<string>(allLocaleId);
	const [lifecycleRecipientFilter, setLifecycleRecipientFilter] =
		useState<string>(allLocaleId);
	const [lifecycleChannelFilter, setLifecycleChannelFilter] =
		useState<string>(allLocaleId);

	useEffect(() => {
		setLifecycleEventFilter(allLocaleId);
	}, [lifecycleDomainFilter]);

	const lifecycleEventOptions = useMemo(() => {
		if (
			lifecycleDomainFilter === allLocaleId ||
			lifecycleDomainFilter === "other"
		) {
			return [
				...new Set([
					...ORDER_LIFECYCLE_EVENTS,
					...RESERVATION_LIFECYCLE_EVENTS,
					...SUBSCRIPTION_LIFECYCLE_EVENTS,
				]),
			].sort((a, b) => a.localeCompare(b));
		}
		if (lifecycleDomainFilter === "order") {
			return [...ORDER_LIFECYCLE_EVENTS];
		}
		if (lifecycleDomainFilter === "reservation") {
			return [...RESERVATION_LIFECYCLE_EVENTS];
		}
		if (lifecycleDomainFilter === "subscription") {
			return [...SUBSCRIPTION_LIFECYCLE_EVENTS];
		}
		return [];
	}, [lifecycleDomainFilter]);

	// Filter templates based on scope and type
	const filteredMessageTemplateData = useMemo(() => {
		let filtered = messageTemplateData;

		// Filter by scope (global vs store-specific)
		if (scopeFilter === "global") {
			filtered = filtered.filter((t) => t.isGlobal === true);
		} else if (scopeFilter === "store") {
			filtered = filtered.filter(
				(t) => t.isGlobal === false && t.storeId === storeId,
			);
		}
		// If scopeFilter is "--" or empty, show all

		// Filter by template type
		if (templateTypeFilter && templateTypeFilter !== allTemplateType) {
			filtered = filtered.filter((t) => t.templateType === templateTypeFilter);
		}

		return filtered;
	}, [messageTemplateData, scopeFilter, templateTypeFilter, storeId]);

	const filteredMessageTemplateLocalizedData = useMemo(() => {
		return messageTemplateLocalizedData
			.filter((item) => {
				const tpl = messageTemplateData.find(
					(x) => x.id === item.messageTemplateId,
				);
				const parsed = tpl?.name?.trim()
					? parseLifecycleTemplateKey(tpl.name.trim())
					: null;

				if (lifecycleDomainFilter !== allLocaleId) {
					if (lifecycleDomainFilter === "other") {
						if (parsed !== null) return false;
					} else if (parsed?.domain !== lifecycleDomainFilter) {
						return false;
					}
				}

				if (
					lifecycleEventFilter !== allLocaleId &&
					(!parsed || parsed.event !== lifecycleEventFilter)
				) {
					return false;
				}

				if (
					lifecycleRecipientFilter !== allLocaleId &&
					(!parsed || parsed.recipient !== lifecycleRecipientFilter)
				) {
					return false;
				}

				if (
					lifecycleChannelFilter !== allLocaleId &&
					(!parsed || parsed.channel !== lifecycleChannelFilter)
				) {
					return false;
				}

				return true;
			})
			.filter((item) => {
				if (!localeIdFilter || localeIdFilter === allLocaleId) return true;
				return item.localeId === localeIdFilter;
			});
	}, [
		messageTemplateData,
		messageTemplateLocalizedData,
		localeIdFilter,
		lifecycleDomainFilter,
		lifecycleEventFilter,
		lifecycleRecipientFilter,
		lifecycleChannelFilter,
	]);

	const newObj = {
		id: "new",
		name: "",
	} as MessageTemplate;

	/* #region maintain data array on client side */

	const handleCreated = (newVal: MessageTemplate) => {
		setMessageTemplateData((prev) => [
			...prev,
			{
				...newVal,
			},
		]);
		logger.info("handleCreated");
	};

	// Handle updated value in the data array
	const handleUpdated = (updatedVal: MessageTemplate) => {
		setMessageTemplateData((prev) =>
			prev.map((cat) => (cat.id === updatedVal.id ? updatedVal : cat)),
		);
		logger.info("handleUpdated");
	};

	const handleDeleted = (deletedVal: MessageTemplate) => {
		setMessageTemplateData((prev) =>
			prev.filter((cat) => cat.id !== deletedVal.id),
		);
		logger.info("handleDeleted");
	};

	/* #endregion */

	/* #region message_template dt */

	const columns: ColumnDef<MessageTemplate>[] = [
		{
			accessorKey: "name",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="name" />;
			},
			cell: ({ row }) => {
				const item = row.original;
				return (
					<div>
						{row.getValue("name")}
						{/* Allow editing all templates - global templates will be saved as store copies */}
						<EditMessageTemplate
							item={row.original}
							onUpdated={handleUpdated}
							storeId={storeId}
						/>
					</div>
				);
			},
			enableHiding: false,
		},
		{
			accessorKey: "templateType",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="Type" />;
			},
		},
		{
			accessorKey: "isGlobal",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="Scope" />;
			},
			cell: ({ row }) => {
				const isGlobal = row.getValue("isGlobal") === true;
				return (
					<div className="pl-3">
						{isGlobal ? (
							<span className="text-sm text-muted-foreground">Global</span>
						) : (
							<span className="text-sm text-muted-foreground">Store</span>
						)}
					</div>
				);
			},
		},
		{
			accessorKey: "localizedCount",
			header: ({ column }) => {
				return <DataTableColumnHeader column={column} title="# of localized" />;
			},
			cell: ({ row }) => {
				const item = row.original;
				const isGlobal = item.isGlobal === true;
				const isStoreTemplate = !isGlobal && item.storeId === storeId;

				return (
					<div className="flex items-center gap-2">
						{row.original.MessageTemplateLocalized.length}
						{/* Allow creating localized for all templates - if global, will create store copy first */}
						<CellCreateNewLocalized item={row.original} />
					</div>
				);
			},
		},
		{
			id: "actions",
			cell: ({ row }) => {
				const item = row.original;
				const isGlobal = item.isGlobal === true;
				const isStoreTemplate = !isGlobal && item.storeId === storeId;

				// Only show delete action for store templates (cannot delete global templates)
				if (isStoreTemplate) {
					return <CellAction item={row.original} onUpdated={handleDeleted} />;
				}
				return null;
			},
		},
	];

	//the plus button to create new localized template
	const CellCreateNewLocalized: React.FC<CellActionProps> = ({ item }) => {
		//filter out the locales that already have a localized template for this message template
		// 1. get the localized templates for this message template
		const localizedTemplates = messageTemplateLocalizedData.filter(
			(localized) => localized.messageTemplateId === item.id,
		);

		// 2. filter out locales that already have localized template
		const availableLocales: Locale[] = (locales || []).filter(
			(locale) =>
				!localizedTemplates.some(
					(localized) => localized.localeId === locale.lng,
				),
		);

		// 3. sort the available locales by name
		availableLocales.sort((a, b) => a.name.localeCompare(b.name));

		// If no locales are available, don't render the button
		if (availableLocales.length === 0) {
			return null;
		}

		const newObj: z.infer<typeof updateMessageTemplateLocalizedSchema> = {
			id: "new",
			messageTemplateId: item.id,
			localeId: availableLocales[0]?.lng || "",
			subject: "",
			body: "",
			isActive: true,
			bCCEmailAddresses: undefined,
			translationStatus: "draft",
			sourceLocaleId: null,
		};

		return (
			<EditMessageTemplateLocalized
				item={newObj}
				locales={availableLocales}
				messageTemplateName={item.name ?? null}
				messageTemplateType={item.templateType ?? null}
				onUpdated={handleMessageTemplateLocalizedCreated}
				isNew={true}
				storeId={storeId}
			/>
		);
	};

	const CellAction: React.FC<CellActionProps> = ({ item, onUpdated }) => {
		const [loading, setLoading] = useState(false);
		const [open, setOpen] = useState(false);

		const onConfirm = async () => {
			try {
				setLoading(true);
				await axios.delete(
					`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${storeId}/messageTemplate/${item.id}`,
				);
				toastSuccess({
					title: "message template deleted",
					description: "",
				});
			} catch (error: unknown) {
				const err = error as AxiosError;
				toastError({
					title: "something wrong.",
					description: err.message,
				});
			} finally {
				setLoading(false);
				setOpen(false);
				handleDeleted(item);
			}
		};

		const onCopy = (id: string) => {
			navigator.clipboard.writeText(id);
			toastSuccess({
				title: "ID copied to clipboard.",
				description: "",
			});
		};

		return (
			<>
				<AlertModal
					isOpen={open}
					onClose={() => setOpen(false)}
					onConfirm={onConfirm}
					loading={loading}
				/>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="size-8 p-0">
							<span className="sr-only">Open menu</span>
							<IconDots className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuItem onClick={() => onCopy(item.id)}>
							<IconCopy className="mr-0 size-4" /> Copy Id
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setOpen(true)}>
							<IconTrash className="mr-0 size-4" /> Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</>
		);
	};

	/* #endregion */

	/* #region messageTemplateLocalized handlers */

	const handleMessageTemplateLocalizedCreated = (
		newMessageTemplateLocalized: MessageTemplateLocalized,
	) => {
		//find the template that this localized template belongs to
		const template = messageTemplateData.find(
			(cat) => cat.id === newMessageTemplateLocalized.messageTemplateId,
		);
		if (template) {
			//add the new localized template to the template
			template.MessageTemplateLocalized = [
				...template.MessageTemplateLocalized,
				newMessageTemplateLocalized,
			];

			handleUpdated(template);
		}
		//add the new localized template to messageTemplateLocalizedData
		setMessageTemplateLocalizedData((prev) => [
			...prev,
			newMessageTemplateLocalized,
		]);
	};

	const handleMessageTemplateLocalizedUpdated = (
		updatedVal: MessageTemplateLocalized,
	) => {
		setMessageTemplateLocalizedData((prev) =>
			prev.map((cat) => (cat.id === updatedVal.id ? updatedVal : cat)),
		);
		logger.info("handleMessageTemplateLocalizedUpdated");
	};

	const handleMessageTemplateLocalizedDeleted = (
		deletedVal: z.infer<typeof updateMessageTemplateLocalizedSchema>,
	) => {
		//remove the localized message template from the messageTemplateData array
		setMessageTemplateLocalizedData((prev) =>
			prev.filter((cat) => cat.id !== deletedVal.id),
		);

		// move the localized template from parent message template
		const template = messageTemplateData.find(
			(cat) => cat.id === deletedVal.messageTemplateId,
		);
		if (template) {
			//remove the localized template from the template
			template.MessageTemplateLocalized =
				template.MessageTemplateLocalized.filter(
					(localized: MessageTemplateLocalized) =>
						localized.id !== deletedVal.id,
				);

			handleUpdated(template);
		}

		logger.info("handleMessageTemplateLocalizedDeleted");
	};
	/* #endregion */

	/* #region messageTemplateLocalized dt columns */

	const columns_messageTemplateLocalized: ColumnDef<MessageTemplateLocalized>[] =
		[
			{
				accessorKey: "subject",
				header: ({ column }) => {
					return <DataTableColumnHeader column={column} title="subject" />;
				},
				cell: ({ row }) => {
					const template = messageTemplateData.find(
						(cat) => cat.id === row.original.messageTemplateId,
					);
					const isGlobal = template?.isGlobal === true;
					const isStoreTemplate = !isGlobal && template?.storeId === storeId;

					return (
						<div>
							{row.getValue("subject")}
							{/* Allow editing all localized templates - if global, will create store copy first */}
							<EditMessageTemplateLocalized
								item={
									{
										...row.original,
										bCCEmailAddresses:
											row.original.bCCEmailAddresses ?? undefined,
										translationStatus:
											row.original.translationStatus || "draft",
										sourceLocaleId: row.original.sourceLocaleId || null,
									} as z.infer<typeof updateMessageTemplateLocalizedSchema>
								}
								locales={locales}
								onUpdated={(updated) => {
									handleMessageTemplateLocalizedUpdated({
										...updated,
										bCCEmailAddresses: updated.bCCEmailAddresses ?? null,
									} as MessageTemplateLocalized);
								}}
								storeId={storeId}
								messageTemplateName={template?.name ?? null}
								messageTemplateType={template?.templateType ?? null}
							/>
						</div>
					);
				},
				enableHiding: false,
			},
			{
				accessorKey: "localeId",
				header: ({ column }) => {
					return <DataTableColumnHeader column={column} title="locale" />;
				},
			},
			{
				accessorKey: "messageTemplateId",
				header: ({ column }) => {
					return <DataTableColumnHeader column={column} title="Template" />;
				},
				cell: ({ row }) => {
					const val = row.getValue("messageTemplateId");
					const template = messageTemplateData.find((cat) => cat.id === val);
					return <div>{template?.name}</div>;
				},
			},
			{
				accessorKey: "isActive",
				header: ({ column }) => {
					return <DataTableColumnHeader column={column} title="isActive" />;
				},
				cell: ({ row }) => {
					const val =
						row.getValue("isActive") === true ? (
							<IconCheck className="text-green-400  size-4" />
						) : (
							<IconX className="text-red-400 size-4" />
						);

					return <div className="pl-3">{val}</div>;
				},
			},
			{
				accessorKey: "bCCEmailAddresses",
				header: ({ column }) => {
					return <DataTableColumnHeader column={column} title="bCC" />;
				},
			},
			{
				id: "actions",
				cell: ({ row }) => {
					const template = messageTemplateData.find(
						(cat) => cat.id === row.original.messageTemplateId,
					);
					const isGlobal = template?.isGlobal === true;
					const isStoreTemplate = !isGlobal && template?.storeId === storeId;

					// Only show actions for store templates
					if (isStoreTemplate) {
						return (
							<CellActionMessageTemplateLocalized
								item={
									{
										...row.original,
										bCCEmailAddresses:
											row.original.bCCEmailAddresses ?? undefined,
										translationStatus:
											row.original.translationStatus || "draft",
										sourceLocaleId: row.original.sourceLocaleId || null,
									} as z.infer<typeof updateMessageTemplateLocalizedSchema>
								}
								onUpdated={handleMessageTemplateLocalizedDeleted}
							/>
						);
					}
					return null;
				},
			},
		];

	interface MessageTemplateLocalizedCellActionProps {
		item: z.infer<typeof updateMessageTemplateLocalizedSchema>;
		onUpdated?: (
			newValue: z.infer<typeof updateMessageTemplateLocalizedSchema>,
		) => void;
	}

	const CellActionMessageTemplateLocalized: React.FC<
		MessageTemplateLocalizedCellActionProps
	> = ({ item, onUpdated }) => {
		const [loading, setLoading] = useState(false);
		const [open, setOpen] = useState(false);

		const onConfirm = async () => {
			try {
				setLoading(true);
				await axios.delete(
					`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${storeId}/messageTemplateLocalized/${item.id}`,
				);
				toastSuccess({
					title: "message template localized deleted",
					description: "",
				});
			} catch (error: unknown) {
				const err = error as AxiosError;
				toastError({
					title: "something wrong.",
					description: err.message,
				});
			} finally {
				setLoading(false);
				setOpen(false);
				handleMessageTemplateLocalizedDeleted(item);
			}
		};

		const onCopy = (id: string) => {
			navigator.clipboard.writeText(id);
			toastSuccess({
				title: "ID copied to clipboard.",
				description: "",
			});
		};

		return (
			<>
				<AlertModal
					isOpen={open}
					onClose={() => setOpen(false)}
					onConfirm={onConfirm}
					loading={loading}
				/>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="size-8 p-0">
							<span className="sr-only">Open menu</span>
							<IconDots className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuItem onClick={() => onCopy(item.id)}>
							<IconCopy className="mr-0 size-4" /> Copy Id
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => setOpen(true)}>
							<IconTrash className="mr-0 size-4" /> Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</>
		);
	};
	/* #endregion */

	return (
		<>
			<div className="flex items-center justify-between">
				<Heading
					title={t("notification_templates")}
					badge={filteredMessageTemplateData.length}
					description={t("notification_templates_descr")}
				/>
				<div className="flex items-center gap-2">
					{/* Scope Filter (Global vs Store-specific) */}
					<Select value={scopeFilter} onValueChange={setScopeFilter}>
						<SelectTrigger className="w-[140px]">
							<SelectValue placeholder="All Scopes" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={allScope}>All Scopes</SelectItem>
							<SelectItem value="global">Global</SelectItem>
							<SelectItem value="store">Store-specific</SelectItem>
						</SelectContent>
					</Select>

					{/* Template Type Filter */}
					<Select
						value={templateTypeFilter}
						onValueChange={setTemplateTypeFilter}
					>
						<SelectTrigger className="w-[140px]">
							<SelectValue placeholder="All Types" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={allTemplateType}>All Types</SelectItem>
							<SelectItem value="email">Email</SelectItem>
							<SelectItem value="line">LINE</SelectItem>
							<SelectItem value="sms">SMS</SelectItem>
							<SelectItem value="whatsapp">WhatsApp</SelectItem>
							<SelectItem value="wechat">WeChat</SelectItem>
							<SelectItem value="telegram">Telegram</SelectItem>
							<SelectItem value="push">Push</SelectItem>
							<SelectItem value="onsite">On-Site</SelectItem>
						</SelectContent>
					</Select>

					{/* Locale Filter Dropdown */}
					<Select value={localeIdFilter} onValueChange={setLocaleIdFilter}>
						<SelectTrigger className="w-[140px]">
							<SelectValue placeholder="All Locales" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={allLocaleId}>All Locales</SelectItem>
							{locales.map((locale: Locale) => (
								<SelectItem key={locale.id} value={locale.lng}>
									{locale.name} ({locale.id})
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{/* Create new template button */}
					<EditMessageTemplate
						item={newObj}
						onUpdated={handleCreated}
						storeId={storeId}
					/>
				</div>
			</div>
			{/* display filtered messageTemplate data */}
			<DataTable columns={columns} data={filteredMessageTemplateData} />

			<Separator />

			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<Heading
					title={t("message_template_localized")}
					badge={filteredMessageTemplateLocalizedData.length}
					description={t("message_template_localized_descr")}
				/>
				<div className="flex min-w-0 flex-wrap items-center gap-2">
					<Select
						value={lifecycleDomainFilter}
						onValueChange={setLifecycleDomainFilter}
					>
						<SelectTrigger className="min-w-[140px] max-w-[min(100vw-2rem,200px)] touch-manipulation">
							<SelectValue placeholder={t("mail_templates_filter_domain")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={allLocaleId}>{t("all")}</SelectItem>
							<SelectItem value="order">
								{t("mail_templates_lifecycle_domain_order")}
							</SelectItem>
							<SelectItem value="reservation">
								{t("mail_templates_lifecycle_domain_reservation")}
							</SelectItem>
							<SelectItem value="subscription">
								{t("mail_templates_lifecycle_domain_subscription")}
							</SelectItem>
							<SelectItem value="other">
								{t("mail_templates_filter_other_name")}
							</SelectItem>
						</SelectContent>
					</Select>
					<Select
						value={lifecycleEventFilter}
						onValueChange={setLifecycleEventFilter}
					>
						<SelectTrigger className="min-w-[160px] max-w-[min(100vw-2rem,240px)] touch-manipulation">
							<SelectValue placeholder={t("mail_templates_filter_event")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={allLocaleId}>{t("all")}</SelectItem>
							{lifecycleEventOptions.map((ev) => (
								<SelectItem key={ev} value={ev}>
									{ev}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={lifecycleRecipientFilter}
						onValueChange={setLifecycleRecipientFilter}
					>
						<SelectTrigger className="min-w-[130px] max-w-[min(100vw-2rem,200px)] touch-manipulation">
							<SelectValue placeholder={t("mail_templates_filter_recipient")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={allLocaleId}>{t("all")}</SelectItem>
							{LIFECYCLE_RECIPIENTS.map((r) => (
								<SelectItem key={r} value={r}>
									{r}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={lifecycleChannelFilter}
						onValueChange={setLifecycleChannelFilter}
					>
						<SelectTrigger className="min-w-[130px] max-w-[min(100vw-2rem,200px)] touch-manipulation">
							<SelectValue placeholder={t("mail_templates_filter_channel")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={allLocaleId}>{t("all")}</SelectItem>
							{LIFECYCLE_CHANNELS.map((ch) => (
								<SelectItem key={ch} value={ch}>
									{ch}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>
			{/* display filtered messageTemplateLocalized data */}
			<DataTable
				searchKey="subject"
				columns={columns_messageTemplateLocalized}
				data={filteredMessageTemplateLocalizedData}
			/>
		</>
	);
};
