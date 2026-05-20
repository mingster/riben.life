"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconCalendar, IconShoppingCart, IconUsers } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { updateStoreSystemsAction } from "@/actions/storeAdmin/settings/update-store-systems";
import {
	type UpdateStoreSystemsInput,
	updateStoreSystemsSchema,
} from "@/actions/storeAdmin/settings/update-store-systems.validation";
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
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { WizardSystems } from "@/lib/store-setup-wizard/wizard-steps";

interface WizardSystemSelectionProps {
	storeId: string;
	initialSystems: WizardSystems;
	onSaved: (systems: WizardSystems) => void;
}

export function WizardSystemSelection({
	storeId,
	initialSystems,
	onSaved,
}: WizardSystemSelectionProps) {
	const { t } = useTranslation();
	const [submitting, setSubmitting] = useState(false);

	const form = useForm<UpdateStoreSystemsInput>({
		resolver: zodResolver(updateStoreSystemsSchema),
		defaultValues: initialSystems,
		mode: "onChange",
	});

	const values = form.watch();
	const hasOneSystem =
		values.useOrderSystem || values.acceptReservation || values.waitlistEnabled;

	const onSubmit = useCallback(
		async (data: UpdateStoreSystemsInput) => {
			if (
				!data.useOrderSystem &&
				!data.acceptReservation &&
				!data.waitlistEnabled
			) {
				form.setError("useOrderSystem", {
					message: t("store_setup_wizard_systems_min_one"),
				});
				return;
			}

			setSubmitting(true);
			try {
				const result = await updateStoreSystemsAction(storeId, data);
				if (result?.serverError) {
					toastError({ description: result.serverError });
					return;
				}
				if (result?.data) {
					onSaved({
						useOrderSystem: result.data.useOrderSystem,
						acceptReservation: result.data.acceptReservation,
						waitlistEnabled: result.data.waitlistEnabled,
					});
				}
			} catch (err: unknown) {
				toastError({
					description: err instanceof Error ? err.message : String(err),
				});
			} finally {
				setSubmitting(false);
			}
		},
		[storeId, form, onSaved, t],
	);

	const cards = [
		{
			key: "acceptReservation" as const,
			icon: IconCalendar,
			title: t("store_admin_systems_rsvp"),
			descr: t("store_admin_systems_rsvp_descr"),
		},
		{
			key: "useOrderSystem" as const,
			icon: IconShoppingCart,
			title: t("store_admin_systems_order_system"),
			descr: t("store_admin_systems_order_system_descr"),
		},
		{
			key: "waitlistEnabled" as const,
			icon: IconUsers,
			title: t("store_admin_systems_waitlist"),
			descr: t("store_admin_systems_waitlist_descr"),
		},
	];

	return (
		<div className="relative" aria-busy={submitting}>
			{submitting ? (
				<div
					className="absolute inset-0 z-100 flex cursor-wait select-none items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
					aria-live="polite"
				>
					<span className="text-sm font-medium text-muted-foreground">
						{t("submitting")}
					</span>
				</div>
			) : null}

			<h2 className="text-xl font-semibold text-foreground">
				{t("store_setup_wizard_systems_heading")}
			</h2>
			<p className="mt-2 text-sm text-muted-foreground">
				{t("store_setup_wizard_systems_subtitle")}
			</p>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
					{cards.map(({ key, icon: Icon, title, descr }) => (
						<FormField
							key={key}
							control={form.control}
							name={key}
							render={({ field }) => (
								<FormItem>
									<div
										className={cn(
											"flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:p-5",
											field.value && "border-primary/40 ring-1 ring-primary/20",
										)}
									>
										<div className="flex min-w-0 flex-1 items-start gap-3">
											<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
												<Icon className="h-5 w-5" />
											</div>
											<div className="min-w-0">
												<FormLabel className="text-base font-semibold">
													{title}
												</FormLabel>
												<p className="mt-1 text-sm text-muted-foreground">
													{descr}
												</p>
											</div>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
												disabled={submitting}
											/>
										</FormControl>
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>
					))}

					<Button
						type="submit"
						className="mt-6 h-11 w-full touch-manipulation sm:h-10 sm:w-auto"
						disabled={submitting || !hasOneSystem}
					>
						{t("store_setup_wizard_continue")}
					</Button>
				</form>
			</Form>
		</div>
	);
}
