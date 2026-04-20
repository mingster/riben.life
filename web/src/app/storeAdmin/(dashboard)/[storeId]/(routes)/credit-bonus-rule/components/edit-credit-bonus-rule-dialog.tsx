"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { createCreditBonusRuleAction } from "@/actions/storeAdmin/credit-bonus-rule/create-credit-bonus-rule";
import {
	type CreateCreditBonusRuleInput,
	createCreditBonusRuleSchema,
} from "@/actions/storeAdmin/credit-bonus-rule/create-credit-bonus-rule.validation";
import { updateCreditBonusRuleAction } from "@/actions/storeAdmin/credit-bonus-rule/update-credit-bonus-rule";
import { useTranslation } from "@/app/i18n/client";
import type { CreditBonusRuleColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/credit-bonus-rule/credit-bonus-rule-column";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface EditCreditBonusRuleDialogProps {
	rule?: CreditBonusRuleColumn | null;
	isNew?: boolean;
	trigger?: React.ReactNode;
	onCreated?: (rule: CreditBonusRuleColumn) => void;
	onUpdated?: (rule: CreditBonusRuleColumn) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function EditCreditBonusRuleDialog({
	rule,
	isNew = false,
	trigger,
	onCreated,
	onUpdated,
	open: controlledOpen,
	onOpenChange: setControlledOpen,
}: EditCreditBonusRuleDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { t } = useTranslation();

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const open = controlledOpen ?? internalOpen;
	const setOpen = setControlledOpen ?? setInternalOpen;

	const isEditMode = Boolean(rule) && !isNew;

	const defaultValues = useMemo<CreateCreditBonusRuleInput>(
		() => ({
			threshold: rule?.threshold ?? 0,
			bonus: rule?.bonus ?? 0,
			isActive: rule?.isActive ?? true,
		}),
		[rule],
	);

	const form = useForm<CreateCreditBonusRuleInput>({
		resolver: zodResolver(
			createCreditBonusRuleSchema,
		) as Resolver<CreateCreditBonusRuleInput>,
		defaultValues,
		mode: "onChange",
	});

	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			setOpen(nextOpen);
			if (!nextOpen) {
				form.reset(defaultValues);
			}
		},
		[defaultValues, form, setOpen],
	);

	const onSubmit = async (values: CreateCreditBonusRuleInput) => {
		setLoading(true);
		try {
			if (isEditMode && rule) {
				const result = await updateCreditBonusRuleAction(
					String(params.storeId),
					{
						id: rule.id,
						threshold: values.threshold,
						bonus: values.bonus,
						isActive: values.isActive,
					},
				);

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.rule) {
					onUpdated?.(result.data.rule);
					toastSuccess({
						title: t("credit_bonus_rule_updated"),
						description: "",
					});
					handleOpenChange(false);
				}
			} else {
				const result = await createCreditBonusRuleAction(
					String(params.storeId),
					values,
				);

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.rule) {
					onCreated?.(result.data.rule);
					toastSuccess({
						title: t("credit_bonus_rule_created"),
						description: "",
					});
					handleOpenChange(false);
				}
			}
		} catch (error: unknown) {
			toastError({
				title: t("error_title"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
			<DialogContent className="max-w-[calc(100%-1rem)] p-4 sm:max-w-lg sm:p-6 max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditMode
							? t("credit_bonus_rule_edit")
							: t("credit_bonus_rule_create")}
					</DialogTitle>
					<DialogDescription>
						{t("credit_bonus_rule_mgmt_descr")}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="relative space-y-4"
						aria-busy={loading}
					>
						{loading && (
							<div
								className="absolute inset-0 z-100 flex cursor-wait select-none items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
								aria-live="polite"
								role="status"
							>
								<span className="text-sm font-medium text-muted-foreground">
									{t("submitting")}
								</span>
							</div>
						)}
						<FormField
							control={form.control}
							name="threshold"
							render={({ field, fieldState }) => (
								<FormItem
									className={cn(
										fieldState.error &&
											"rounded-md border border-destructive/50 bg-destructive/5 p-2",
									)}
								>
									<FormLabel>
										{t("credit_bonus_rule_threshold")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											step="0.01"
											min={0}
											disabled={loading || form.formState.isSubmitting}
											className={cn(
												"h-10 text-base sm:h-9 sm:text-sm touch-manipulation",
												fieldState.error &&
													"border-destructive focus-visible:ring-destructive",
											)}
											{...field}
											onChange={(e) =>
												field.onChange(Number.parseFloat(e.target.value) || 0)
											}
											value={field.value}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t(
											"credit_bonus_rule_minimum_top_up_amount_to_trigger_bonus",
										)}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="bonus"
							render={({ field, fieldState }) => (
								<FormItem
									className={cn(
										fieldState.error &&
											"rounded-md border border-destructive/50 bg-destructive/5 p-2",
									)}
								>
									<FormLabel>
										{t("credit_bonus_rule_bonus")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											step="0.01"
											min={0}
											disabled={loading || form.formState.isSubmitting}
											className={cn(
												"h-10 text-base sm:h-9 sm:text-sm touch-manipulation",
												fieldState.error &&
													"border-destructive focus-visible:ring-destructive",
											)}
											{...field}
											onChange={(e) =>
												field.onChange(Number.parseFloat(e.target.value) || 0)
											}
											value={field.value}
										/>
									</FormControl>
									<FormDescription className="text-xs font-mono text-gray-500">
										{t(
											"credit_bonus_rule_bonus_amount_given_when_threshold_is_met",
										)}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="isActive"
							render={({ field }) => (
								<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
									<div className="space-y-0.5">
										<FormLabel className="text-base">{t("status")}</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("credit_bonus_rule_enable_or_disable_this_bonus_rule")}
										</FormDescription>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
											disabled={loading || form.formState.isSubmitting}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								disabled={loading}
								onClick={() => handleOpenChange(false)}
								className="touch-manipulation"
							>
								{t("cancel")}
							</Button>
							<Button
								type="submit"
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="touch-manipulation disabled:opacity-25"
							>
								{t("save")}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
