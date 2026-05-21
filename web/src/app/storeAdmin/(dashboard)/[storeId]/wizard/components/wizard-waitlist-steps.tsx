"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { updateWaitlistSettingsAction } from "@/actions/storeAdmin/waitlist/update-waitlist-settings";
import {
	type UpdateWaitlistSettingsInput,
	updateWaitlistSettingsSchema,
} from "@/actions/storeAdmin/waitlist/update-waitlist-settings.validation";
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

type WaitlistSubStep = "guest" | "window" | "done";

interface WizardWaitlistStepsProps {
	storeId: string;
	initialSettings: UpdateWaitlistSettingsInput;
	onAdvance: () => void;
	onSkipSection: () => void;
}

export function WizardWaitlistSteps({
	storeId,
	initialSettings,
	onAdvance,
	onSkipSection,
}: WizardWaitlistStepsProps) {
	const { t } = useTranslation();
	const [subStep, setSubStep] = useState<WaitlistSubStep>("guest");
	const [submitting, setSubmitting] = useState(false);

	const guestForm = useForm<UpdateWaitlistSettingsInput>({
		resolver: zodResolver(
			updateWaitlistSettingsSchema,
		) as Resolver<UpdateWaitlistSettingsInput>,
		defaultValues: {
			...initialSettings,
			enabled: true,
			requireName: initialSettings.requireName ?? true,
			requirePhone: initialSettings.requirePhone ?? true,
			requireSignIn: initialSettings.requireSignIn ?? true,
		},
		mode: "onChange",
	});

	const canGetNumBeforeSchema = z.object({
		canGetNumBefore: z.number().int(),
	});

	const windowForm = useForm<z.infer<typeof canGetNumBeforeSchema>>({
		resolver: zodResolver(canGetNumBeforeSchema),
		defaultValues: {
			canGetNumBefore: initialSettings.canGetNumBefore ?? 0,
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

	const saveSettings = async (data: Partial<UpdateWaitlistSettingsInput>) => {
		setSubmitting(true);
		try {
			const payload: UpdateWaitlistSettingsInput = {
				...initialSettings,
				enabled: true,
				requireSignIn:
					data.requireSignIn ?? guestForm.getValues("requireSignIn"),
				requireName: data.requireName ?? guestForm.getValues("requireName"),
				requirePhone: data.requirePhone ?? guestForm.getValues("requirePhone"),
				canGetNumBefore:
					data.canGetNumBefore ??
					windowForm.getValues("canGetNumBefore") ??
					initialSettings.canGetNumBefore,
			};
			const result = await updateWaitlistSettingsAction(storeId, payload);
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return false;
			}
			return true;
		} catch (err: unknown) {
			toastError({
				description: err instanceof Error ? err.message : String(err),
			});
			return false;
		} finally {
			setSubmitting(false);
		}
	};

	const onGuestSubmit = guestForm.handleSubmit(async (data) => {
		const ok = await saveSettings(data);
		if (ok) {
			setSubStep("window");
		}
	});

	const onWindowSubmit = windowForm.handleSubmit(async (data) => {
		const ok = await saveSettings({ canGetNumBefore: data.canGetNumBefore });
		if (ok) {
			setSubStep("done");
		}
	});

	if (subStep === "guest") {
		return (
			<div className="relative space-y-6" aria-busy={submitting}>
				{overlay}
				<h2 className="text-xl font-semibold">
					{t("store_setup_wizard_waitlist_guest_heading")}
				</h2>
				<p className="text-sm text-muted-foreground">
					{t("store_setup_wizard_waitlist_guest_subtitle")}
				</p>
				<Form {...guestForm}>
					<form onSubmit={onGuestSubmit} className="space-y-4">
						{(
							[
								["requireName", "store_admin_rsvp_waitlist_require_name"],
								["requirePhone", "store_admin_rsvp_waitlist_require_phone"],
								["requireSignIn", "store_admin_rsvp_waitlist_require_signin"],
							] as const
						).map(([name, labelKey]) => (
							<FormField
								key={name}
								control={guestForm.control}
								name={name}
								render={({ field }) => (
									<FormItem className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
										<FormLabel className="font-medium">{t(labelKey)}</FormLabel>
										<FormControl>
											<Switch
												checked={Boolean(field.value)}
												onCheckedChange={field.onChange}
												disabled={submitting}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
						))}
						<Button
							type="submit"
							className="h-11 w-full touch-manipulation sm:w-auto"
							disabled={submitting}
						>
							{t("store_setup_wizard_continue")}
						</Button>
					</form>
				</Form>
				<SkipButton onSkip={onSkipSection} disabled={submitting} />
			</div>
		);
	}

	if (subStep === "window") {
		return (
			<div className="relative space-y-6" aria-busy={submitting}>
				{overlay}
				<h2 className="text-xl font-semibold">
					{t("store_setup_wizard_waitlist_window_heading")}
				</h2>
				<p className="text-sm text-muted-foreground">
					{t("store_setup_wizard_waitlist_window_descr")}
				</p>
				<Form {...windowForm}>
					<form onSubmit={onWindowSubmit} className="space-y-4">
						<FormField
							control={windowForm.control}
							name="canGetNumBefore"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("store_admin_waitlist_can_get_num_before")}
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											className="h-10 sm:h-9"
											{...field}
											onChange={(e) =>
												field.onChange(Number.parseInt(e.target.value, 10) || 0)
											}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button
							type="submit"
							className="h-11 w-full touch-manipulation sm:w-auto"
							disabled={submitting}
						>
							{t("store_setup_wizard_continue")}
						</Button>
					</form>
				</Form>
				<SkipButton onSkip={onSkipSection} disabled={submitting} />
			</div>
		);
	}

	return (
		<div className="relative space-y-6">
			<h2 className="text-xl font-semibold">
				{t("store_setup_wizard_waitlist_done_heading")}
			</h2>
			<p className="text-sm text-muted-foreground">
				{t("store_setup_wizard_waitlist_done_body")}
			</p>
			<Button variant="outline" className="h-11 touch-manipulation" asChild>
				<Link href={`/storeAdmin/${storeId}/waitlist`}>
					{t("store_setup_wizard_waitlist_open_queue")}
				</Link>
			</Button>
			<Button
				type="button"
				className="h-11 w-full touch-manipulation sm:ml-3 sm:w-auto"
				onClick={onAdvance}
			>
				{t("store_setup_wizard_continue")}
			</Button>
			<SkipButton onSkip={onSkipSection} />
		</div>
	);
}

function SkipButton({
	onSkip,
	disabled,
}: {
	onSkip: () => void;
	disabled?: boolean;
}) {
	const { t } = useTranslation();
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
