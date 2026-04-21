"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { StoreSettings } from "@prisma/client";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { updateStorePoliciesContentAction } from "@/actions/storeAdmin/settings/update-store-policies-content";
import {
	type UpdateStorePolicyTabContentInput,
	updateStorePolicyTabContentSchema,
} from "@/actions/storeAdmin/settings/update-store-policies-content.validation";
import { useTranslation } from "@/app/i18n/client";
import {
	AdminSettingsTabFormFooter,
	AdminSettingsTabs,
	AdminSettingsTabsContent,
	AdminSettingsTabsList,
	AdminSettingsTabsTrigger,
} from "@/components/admin-settings-tabs";
import { FormSubmitOverlay } from "@/components/form-submit-overlay";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { adminCrudUseFormProps } from "@/lib/admin-form-defaults";
import { useI18n } from "@/providers/i18n-provider";

const MarkDownEditor = dynamic(
	() => import("@/components/editor/EditorComponent"),
	{ ssr: false },
);

type SinglePolicyForm = UpdateStorePolicyTabContentInput;

type PolicyField =
	| "privacyPolicy"
	| "tos"
	| "storefrontShippingPolicy"
	| "storefrontReturnPolicy"
	| "storefrontGiftingContent";

interface ClientPoliciesProps {
	initialSettings: StoreSettings | null;
}

export function ClientPolicies({ initialSettings }: ClientPoliciesProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [loadingField, setLoadingField] = useState<PolicyField | null>(null);

	const [draft, setDraft] = useState(() => ({
		privacyPolicy: initialSettings?.privacyPolicy ?? "",
		tos: initialSettings?.tos ?? "",
		storefrontShippingPolicy: initialSettings?.storefrontShippingPolicy ?? "",
		storefrontReturnPolicy: initialSettings?.storefrontReturnPolicy ?? "",
		storefrontGiftingContent: initialSettings?.storefrontGiftingContent ?? "",
	}));

	/** Bumps so MarkDownEditor remounts after save (editor keeps internal state otherwise). */
	const [editorNonce, setEditorNonce] = useState<
		Partial<Record<PolicyField, number>>
	>({});

	const makeSubmit = useCallback(
		(field: PolicyField) => async (data: SinglePolicyForm) => {
			setLoadingField(field);
			try {
				const result = await updateStorePoliciesContentAction(
					String(params.storeId),
					{ [field]: data.content },
				);
				if (result?.serverError) {
					toastError({ description: result.serverError });
					return;
				}
				setDraft((prev) => ({ ...prev, [field]: data.content }));
				setEditorNonce((prev) => ({
					...prev,
					[field]: (prev[field] ?? 0) + 1,
				}));
				toastSuccess({ description: t("store_policies_saved") });
			} finally {
				setLoadingField(null);
			}
		},
		[params.storeId, t],
	);

	return (
		<div className="relative max-w-4xl space-y-6">
			<p className="text-sm text-muted-foreground">
				{t("store_policies_page_descr")}
			</p>
			<Separator />
			<AdminSettingsTabs defaultValue="privacy">
				<AdminSettingsTabsList className="sm:flex-nowrap">
					<AdminSettingsTabsTrigger value="privacy">
						{t("store_settings_privacy_policy")}
					</AdminSettingsTabsTrigger>
					<AdminSettingsTabsTrigger value="terms">
						{t("store_settings_terms")}
					</AdminSettingsTabsTrigger>
					<AdminSettingsTabsTrigger value="shipping">
						{t("storefront_shipping_policy")}
					</AdminSettingsTabsTrigger>
					<AdminSettingsTabsTrigger value="returns">
						{t("storefront_return_policy")}
					</AdminSettingsTabsTrigger>
					<AdminSettingsTabsTrigger value="gifting">
						{t("storefront_gifting_content")}
					</AdminSettingsTabsTrigger>
				</AdminSettingsTabsList>

				<AdminSettingsTabsContent value="privacy" className="space-y-4">
					<PolicyTabForm
						editorKey={`privacy-${editorNonce.privacyPolicy ?? 0}`}
						loading={loadingField === "privacyPolicy"}
						initialMarkdown={draft.privacyPolicy}
						label={t("store_settings_privacy_policy")}
						description={t("store_policies_privacy_descr")}
						onSubmit={makeSubmit("privacyPolicy")}
					/>
				</AdminSettingsTabsContent>
				<AdminSettingsTabsContent value="terms" className="space-y-4">
					<PolicyTabForm
						editorKey={`terms-${editorNonce.tos ?? 0}`}
						loading={loadingField === "tos"}
						initialMarkdown={draft.tos}
						label={t("store_settings_terms")}
						description={t("store_policies_terms_descr")}
						onSubmit={makeSubmit("tos")}
					/>
				</AdminSettingsTabsContent>
				<AdminSettingsTabsContent value="shipping" className="space-y-4">
					<PolicyTabForm
						editorKey={`shipping-${editorNonce.storefrontShippingPolicy ?? 0}`}
						loading={loadingField === "storefrontShippingPolicy"}
						initialMarkdown={draft.storefrontShippingPolicy}
						label={t("storefront_shipping_policy")}
						description={t("storefront_shipping_policy_descr")}
						onSubmit={makeSubmit("storefrontShippingPolicy")}
					/>
				</AdminSettingsTabsContent>
				<AdminSettingsTabsContent value="returns" className="space-y-4">
					<PolicyTabForm
						editorKey={`returns-${editorNonce.storefrontReturnPolicy ?? 0}`}
						loading={loadingField === "storefrontReturnPolicy"}
						initialMarkdown={draft.storefrontReturnPolicy}
						label={t("storefront_return_policy")}
						description={t("storefront_return_policy_descr")}
						onSubmit={makeSubmit("storefrontReturnPolicy")}
					/>
				</AdminSettingsTabsContent>
				<AdminSettingsTabsContent value="gifting" className="space-y-4">
					<PolicyTabForm
						editorKey={`gifting-${editorNonce.storefrontGiftingContent ?? 0}`}
						loading={loadingField === "storefrontGiftingContent"}
						initialMarkdown={draft.storefrontGiftingContent}
						label={t("storefront_gifting_content")}
						description={t("storefront_gifting_content_descr")}
						onSubmit={makeSubmit("storefrontGiftingContent")}
					/>
				</AdminSettingsTabsContent>
			</AdminSettingsTabs>
		</div>
	);
}

function PolicyTabForm({
	editorKey,
	loading,
	initialMarkdown,
	label,
	description,
	onSubmit,
}: {
	editorKey: string;
	loading: boolean;
	initialMarkdown: string;
	label: string;
	description: string;
	onSubmit: (data: SinglePolicyForm) => Promise<void>;
}) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const form = useForm<SinglePolicyForm>({
		...adminCrudUseFormProps,
		resolver: zodResolver(updateStorePolicyTabContentSchema),
		defaultValues: { content: initialMarkdown },
	});

	useEffect(() => {
		form.reset({ content: initialMarkdown });
	}, [initialMarkdown, form]);

	return (
		<div className="relative space-y-4" aria-busy={loading}>
			<FormSubmitOverlay visible={loading} statusText={t("saving")} />
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<FormField
						control={form.control}
						name="content"
						render={({ field, fieldState }) => (
							<FormItem
								className={
									fieldState.error
										? "rounded-md border border-destructive/50 bg-destructive/5 p-2"
										: undefined
								}
							>
								<FormLabel>{label}</FormLabel>
								<FormControl>
									<MarkDownEditor
										key={editorKey}
										markdown={field.value}
										onPChange={field.onChange}
									/>
								</FormControl>
								<FormDescription className="text-xs font-mono text-gray-500">
									{description}
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
					<AdminSettingsTabFormFooter>
						<Button
							type="submit"
							disabled={loading || !form.formState.isValid}
							className="touch-manipulation disabled:opacity-25"
						>
							{t("save")}
						</Button>
					</AdminSettingsTabFormFooter>
				</form>
			</Form>
		</div>
	);
}
