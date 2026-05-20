"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { updateStoreBasicAction } from "@/actions/storeAdmin/settings/update-store-basic";
import type { UpdateStoreBasicInput } from "@/actions/storeAdmin/settings/update-store-basic.validation";
import { wizardCreateFirstMenuAction } from "@/actions/storeAdmin/setup-wizard/wizard-create-first-menu";
import { useTranslation } from "@/app/i18n/client";
import { toastError } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type OrderSubStep = "open" | "menu" | "payments" | "done";

const menuSchema = z.object({
	categoryName: z.string().trim().min(1),
	productName: z.string().trim().min(1),
	price: z.coerce.number().min(0),
});

interface WizardOrderStepsProps {
	storeId: string;
	storeBasic: UpdateStoreBasicInput;
	featuredProductCount: number;
	paymentMethodCount: number;
	shippingMethodCount: number;
	onAdvance: () => void;
	onSkipSection: () => void;
}

export function WizardOrderSteps({
	storeId,
	storeBasic,
	featuredProductCount,
	paymentMethodCount,
	shippingMethodCount,
	onAdvance,
	onSkipSection,
}: WizardOrderStepsProps) {
	const { t } = useTranslation();
	const [subStep, setSubStep] = useState<OrderSubStep>(
		featuredProductCount > 0 ? "payments" : "open",
	);
	const [submitting, setSubmitting] = useState(false);
	const [isOpen, setIsOpen] = useState(storeBasic.isOpen ?? true);

	const menuForm = useForm({
		resolver: zodResolver(menuSchema),
		defaultValues: {
			categoryName: t("store_setup_wizard_order_category_name"),
			productName: "",
			price: 0,
		},
		mode: "onChange",
	});

	const overlay = submitting ? (
		<div
			className="absolute inset-0 z-100 flex cursor-wait select-none items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
			aria-live="polite"
		>
			<span className="text-sm font-medium text-muted-foreground">
				{t("submitting")}
			</span>
		</div>
	) : null;

	const confirmOpen = useCallback(async () => {
		setSubmitting(true);
		try {
			const result = await updateStoreBasicAction(storeId, {
				...storeBasic,
				isOpen: true,
			});
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			setIsOpen(true);
			setSubStep(featuredProductCount > 0 ? "payments" : "menu");
		} catch (err: unknown) {
			toastError({
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSubmitting(false);
		}
	}, [storeId, storeBasic, featuredProductCount]);

	const onMenuSubmit = menuForm.handleSubmit(async (data) => {
		setSubmitting(true);
		try {
			const result = await wizardCreateFirstMenuAction(storeId, data);
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			setSubStep("payments");
		} catch (err: unknown) {
			toastError({
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSubmitting(false);
		}
	});

	if (subStep === "open") {
		return (
			<div className="relative space-y-6" aria-busy={submitting}>
				{overlay}
				<h2 className="text-xl font-semibold">
					{t("store_setup_wizard_order_open_heading")}
				</h2>
				<p className="text-sm text-muted-foreground">
					{t("store_setup_wizard_order_open_body")}
				</p>
				<div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
					<span className="font-medium">
						{t("store_setup_wizard_order_open_heading")}
					</span>
					<Switch
						checked={isOpen}
						onCheckedChange={setIsOpen}
						disabled={submitting}
					/>
				</div>
				<Button
					type="button"
					className="h-11 w-full touch-manipulation sm:w-auto"
					disabled={submitting}
					onClick={() => void confirmOpen()}
				>
					{t("store_setup_wizard_continue")}
				</Button>
				<SkipFooter onSkip={onSkipSection} disabled={submitting} t={t} />
			</div>
		);
	}

	if (subStep === "menu") {
		return (
			<div className="relative space-y-6" aria-busy={submitting}>
				{overlay}
				<h2 className="text-xl font-semibold">
					{t("store_setup_wizard_order_menu_heading")}
				</h2>
				<Form {...menuForm}>
					<form onSubmit={onMenuSubmit} className="space-y-4">
						<FormField
							control={menuForm.control}
							name="categoryName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("store_setup_wizard_order_category_name")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input className="h-10 sm:h-9" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={menuForm.control}
							name="productName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("store_setup_wizard_order_product_name")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input className="h-10 sm:h-9" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={menuForm.control}
							name="price"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("store_setup_wizard_order_product_price")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={0}
											step="1"
											className="h-10 sm:h-9"
											{...field}
											value={field.value as number}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button
							type="submit"
							className="h-11 w-full touch-manipulation sm:w-auto"
							disabled={submitting || !menuForm.formState.isValid}
						>
							{t("store_setup_wizard_continue")}
						</Button>
					</form>
				</Form>
				<SkipFooter onSkip={onSkipSection} disabled={submitting} t={t} />
			</div>
		);
	}

	if (subStep === "payments") {
		return (
			<div className="relative space-y-6" aria-busy={submitting}>
				{overlay}
				<h2 className="text-xl font-semibold">
					{t("store_setup_wizard_order_payments_heading")}
				</h2>
				<p className="text-sm text-muted-foreground">
					{t("store_setup_wizard_order_payments_body")}
				</p>
				<p className="text-sm tabular-nums text-foreground">
					{paymentMethodCount} / {shippingMethodCount}
				</p>
				<Button
					type="button"
					className="h-11 w-full touch-manipulation sm:w-auto"
					onClick={() => setSubStep("done")}
				>
					{t("store_setup_wizard_continue")}
				</Button>
				<SkipFooter onSkip={onSkipSection} disabled={submitting} t={t} />
			</div>
		);
	}

	return (
		<div className="relative space-y-6">
			<h2 className="text-xl font-semibold">
				{t("store_setup_wizard_order_done_heading")}
			</h2>
			<Button variant="outline" className="h-11 touch-manipulation" asChild>
				<Link href={`/storeAdmin/${storeId}/products`}>
					{t("store_setup_wizard_order_configure_more")}
				</Link>
			</Button>
			<Button
				type="button"
				className="h-11 w-full touch-manipulation sm:ml-3 sm:w-auto"
				onClick={onAdvance}
			>
				{t("store_setup_wizard_continue")}
			</Button>
			<SkipFooter onSkip={onSkipSection} t={t} />
		</div>
	);
}

function SkipFooter({
	onSkip,
	disabled,
	t,
}: {
	onSkip: () => void;
	disabled?: boolean;
	t: (key: string) => string;
}) {
	return (
		<div className="pt-4">
			<Button
				type="button"
				variant="ghost"
				className="h-11 text-muted-foreground touch-manipulation"
				onClick={onSkip}
				disabled={disabled}
			>
				{t("store_setup_wizard_skip_section")}
			</Button>
		</div>
	);
}
