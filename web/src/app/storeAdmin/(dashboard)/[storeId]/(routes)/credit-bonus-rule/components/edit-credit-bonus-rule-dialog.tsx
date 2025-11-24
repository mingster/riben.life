"use client";

import { useTranslation } from "@/app/i18n/client";
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
import { useI18n } from "@/providers/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { createCreditBonusRuleAction } from "@/actions/storeAdmin/credit-bonus-rule/create-credit-bonus-rule";
import { updateCreditBonusRuleAction } from "@/actions/storeAdmin/credit-bonus-rule/update-credit-bonus-rule";
import {
	createCreditBonusRuleSchema,
	type CreateCreditBonusRuleInput,
} from "@/actions/storeAdmin/credit-bonus-rule/create-credit-bonus-rule.validation";
import {
	updateCreditBonusRuleSchema,
	type UpdateCreditBonusRuleInput,
} from "@/actions/storeAdmin/credit-bonus-rule/update-credit-bonus-rule.validation";
import type { CreditBonusRuleColumn } from "../credit-bonus-rule-column";

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
	open,
	onOpenChange,
}: EditCreditBonusRuleDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const isEditMode = Boolean(rule) && !isNew;

	const defaultValues = rule
		? {
				...rule,
			}
		: {
				storeId: String(params.storeId),
				id: "",
				threshold: 0,
				bonus: 0,
				isActive: true,
			};

	// Use createCreditBonusRuleSchema when isNew, updateCreditBonusRuleSchema when editing
	const schema = useMemo(
		() =>
			isEditMode ? updateCreditBonusRuleSchema : createCreditBonusRuleSchema,
		[isEditMode],
	);

	// Form input type: UpdateCreditBonusRuleInput when editing, CreateCreditBonusRuleInput when creating
	type FormInput = Omit<UpdateCreditBonusRuleInput, "id"> & {
		id?: string;
	};

	const form = useForm<FormInput>({
		resolver: zodResolver(schema) as Resolver<FormInput>,
		defaultValues,
		mode: "onChange",
		reValidateMode: "onChange",
	});

	const {
		formState: { errors },
		clearErrors,
	} = form;

	const isControlled = typeof open === "boolean";
	const dialogOpen = isControlled ? open : internalOpen;

	const resetForm = useCallback(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const handleOpenChange = (nextOpen: boolean) => {
		if (!isControlled) {
			setInternalOpen(nextOpen);
		}
		onOpenChange?.(nextOpen);
		if (!nextOpen) {
			resetForm();
			clearErrors();
		}
	};

	const handleSuccess = (updatedRule: CreditBonusRuleColumn) => {
		if (isEditMode) {
			onUpdated?.(updatedRule);
		} else {
			onCreated?.(updatedRule);
		}

		toastSuccess({
			title: t("Credit_Bonus_Rule") + t(isEditMode ? "Updated" : "Created"),
			description: "",
		});

		resetForm();
		handleOpenChange(false);
	};

	const onSubmit = async (values: FormInput) => {
		try {
			setLoading(true);

			if (!isEditMode) {
				const result = await createCreditBonusRuleAction({
					storeId: String(params.storeId),
					threshold: values.threshold,
					bonus: values.bonus,
					isActive: values.isActive,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.rule) {
					handleSuccess(result.data.rule);
				}
			} else {
				const ruleId = rule?.id;
				if (!ruleId) {
					toastError({
						title: t("error_title"),
						description: "Credit bonus rule not found.",
					});
					return;
				}

				const result = await updateCreditBonusRuleAction({
					storeId: String(params.storeId),
					id: ruleId,
					threshold: values.threshold,
					bonus: values.bonus,
					isActive: values.isActive,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.rule) {
					handleSuccess(result.data.rule);
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
		<Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{isEditMode
							? t("edit") + t("Credit_Bonus_Rules")
							: t("create") + t("Credit_Bonus_Rules")}
					</DialogTitle>
					<DialogDescription></DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit, (errors) => {
							const firstErrorKey = Object.keys(errors)[0];
							if (firstErrorKey) {
								const error = errors[firstErrorKey as keyof typeof errors];
								const errorMessage = error?.message;
								if (errorMessage) {
									toastError({
										title: t("error_title"),
										description: errorMessage,
									});
								}
							}
						})}
						className="space-y-4"
					>
						<FormField
							control={form.control}
							name="threshold"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("credit_bonus_rule_threshold")}</FormLabel>
									<FormControl>
										<Input
											type="number"
											step="0.01"
											disabled={loading || form.formState.isSubmitting}
											value={
												field.value !== undefined ? field.value.toString() : "0"
											}
											onChange={(event) =>
												field.onChange(Number(event.target.value))
											}
										/>
									</FormControl>
									<FormDescription>
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
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("credit_bonus_rule_bonus")}</FormLabel>
									<FormControl>
										<Input
											type="number"
											step="0.01"
											disabled={loading || form.formState.isSubmitting}
											value={
												field.value !== undefined ? field.value.toString() : "0"
											}
											onChange={(event) =>
												field.onChange(Number(event.target.value))
											}
										/>
									</FormControl>
									<FormDescription>
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
								<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
									<div className="space-y-0.5">
										<FormLabel>{t("active")}</FormLabel>
										<FormDescription>
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

						<DialogFooter className="flex w-full justify-end space-x-2">
							<Button
								type="submit"
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
							>
								{isEditMode ? t("save") : t("create")}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => handleOpenChange(false)}
								disabled={loading || form.formState.isSubmitting}
							>
								{t("cancel")}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
