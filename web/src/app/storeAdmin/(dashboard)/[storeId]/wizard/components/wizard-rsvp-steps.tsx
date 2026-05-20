"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createFacilityAction } from "@/actions/storeAdmin/facility/create-facility";
import { createFacilitySchema } from "@/actions/storeAdmin/facility/create-facility.validation";
import { updateRsvpSettingsAction } from "@/actions/storeAdmin/rsvpSettings/update-rsvp-settings";
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
import { cn } from "@/lib/utils";

type RsvpSubStep = "mode" | "bookable" | "done";

const restaurantSchema = z.object({
	maxCapacity: z.coerce.number().int().min(0).optional(),
});

interface WizardRsvpStepsProps {
	storeId: string;
	initialRsvpMode: number;
	facilityCount: number;
	serviceStaffCount: number;
	onAdvance: () => void;
	onSkipSection: () => void;
}

export function WizardRsvpSteps({
	storeId,
	initialRsvpMode,
	facilityCount,
	serviceStaffCount,
	onAdvance,
	onSkipSection,
}: WizardRsvpStepsProps) {
	const { t } = useTranslation();
	const [subStep, setSubStep] = useState<RsvpSubStep>(
		facilityCount > 0 || initialRsvpMode === 2 ? "done" : "mode",
	);
	const [rsvpMode, setRsvpMode] = useState(initialRsvpMode);
	const [submitting, setSubmitting] = useState(false);

	const facilityForm = useForm({
		resolver: zodResolver(createFacilitySchema),
		defaultValues: {
			facilityName: "",
			capacity: 1,
			defaultCost: 0,
			defaultCredit: 0,
			defaultDuration: 60,
			useOwnBusinessHours: false,
			businessHours: null as string | null,
		},
		mode: "onChange",
	});

	const restaurantForm = useForm({
		resolver: zodResolver(restaurantSchema),
		defaultValues: { maxCapacity: 0 },
	});

	const saveMode = useCallback(
		async (mode: number) => {
			setSubmitting(true);
			try {
				const result = await updateRsvpSettingsAction(storeId, {
					rsvpMode: mode,
				});
				if (result?.serverError) {
					toastError({ description: result.serverError });
					return false;
				}
				setRsvpMode(mode);
				if (mode === 1 && serviceStaffCount > 0) {
					setSubStep("done");
				} else if (mode === 2) {
					setSubStep("bookable");
				} else {
					setSubStep(facilityCount > 0 ? "done" : "bookable");
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
		},
		[storeId, facilityCount, serviceStaffCount],
	);

	const onFacilitySubmit = facilityForm.handleSubmit(async (data) => {
		setSubmitting(true);
		try {
			const result = await createFacilityAction(storeId, data);
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			setSubStep("done");
		} catch (err: unknown) {
			toastError({
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSubmitting(false);
		}
	});

	const onRestaurantSubmit = restaurantForm.handleSubmit(async (data) => {
		setSubmitting(true);
		try {
			const result = await updateRsvpSettingsAction(storeId, {
				maxCapacity: data.maxCapacity ?? 0,
			});
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			setSubStep("done");
		} catch (err: unknown) {
			toastError({
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setSubmitting(false);
		}
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

	const modeOptions = [
		{
			mode: 0,
			title: t("store_setup_wizard_rsvp_mode_facility"),
			descr: t("store_setup_wizard_rsvp_mode_facility_descr"),
		},
		{
			mode: 1,
			title: t("store_setup_wizard_rsvp_mode_personnel"),
			descr: t("store_setup_wizard_rsvp_mode_personnel_descr"),
		},
		{
			mode: 2,
			title: t("store_setup_wizard_rsvp_mode_restaurant"),
			descr: t("store_setup_wizard_rsvp_mode_restaurant_descr"),
		},
	];

	if (subStep === "mode") {
		return (
			<div className="relative space-y-6" aria-busy={submitting}>
				{overlay}
				<h2 className="text-xl font-semibold">
					{t("store_setup_wizard_rsvp_mode_heading")}
				</h2>
				<div className="grid gap-3 sm:grid-cols-1">
					{modeOptions.map((opt) => (
						<button
							key={opt.mode}
							type="button"
							disabled={submitting}
							onClick={() => void saveMode(opt.mode)}
							className={cn(
								"rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 sm:p-5 touch-manipulation",
								rsvpMode === opt.mode &&
									"border-primary ring-1 ring-primary/20",
							)}
						>
							<p className="font-semibold text-foreground">{opt.title}</p>
							<p className="mt-1 text-sm text-muted-foreground">{opt.descr}</p>
						</button>
					))}
				</div>
				<WizardStepFooter onSkip={onSkipSection} skipDisabled={submitting} />
			</div>
		);
	}

	if (subStep === "bookable") {
		if (rsvpMode === 1 && serviceStaffCount > 0) {
			return (
				<div className="relative space-y-6" aria-busy={submitting}>
					{overlay}
					<h2 className="text-xl font-semibold">
						{t("store_setup_wizard_rsvp_bookable_heading")}
					</h2>
					<p className="text-sm text-muted-foreground">
						{t("store_setup_wizard_rsvp_personnel_ready")}
					</p>
					<Button
						type="button"
						className="h-11 w-full touch-manipulation sm:w-auto"
						onClick={() => setSubStep("done")}
					>
						{t("store_setup_wizard_continue")}
					</Button>
					<WizardStepFooter onSkip={onSkipSection} skipDisabled={submitting} />
				</div>
			);
		}

		if (rsvpMode === 2) {
			return (
				<div className="relative space-y-6" aria-busy={submitting}>
					{overlay}
					<h2 className="text-xl font-semibold">
						{t("store_setup_wizard_rsvp_bookable_heading")}
					</h2>
					<Form {...restaurantForm}>
						<form onSubmit={onRestaurantSubmit} className="space-y-4">
							<FormField
								control={restaurantForm.control}
								name="maxCapacity"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("store_setup_wizard_rsvp_restaurant_capacity")}
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												min={0}
												className="h-10 sm:h-9"
												{...field}
												value={
													typeof field.value === "number" ? field.value : ""
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
					<WizardStepFooter onSkip={onSkipSection} skipDisabled={submitting} />
				</div>
			);
		}

		return (
			<div className="relative space-y-6" aria-busy={submitting}>
				{overlay}
				<h2 className="text-xl font-semibold">
					{t("store_setup_wizard_rsvp_bookable_heading")}
				</h2>
				<Form {...facilityForm}>
					<form onSubmit={onFacilitySubmit} className="space-y-4">
						<FormField
							control={facilityForm.control}
							name="facilityName"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("store_setup_wizard_rsvp_facility_name")}{" "}
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
							control={facilityForm.control}
							name="capacity"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("store_setup_wizard_rsvp_facility_capacity")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={1}
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
							disabled={submitting || !facilityForm.formState.isValid}
						>
							{t("store_setup_wizard_continue")}
						</Button>
					</form>
				</Form>
				<WizardStepFooter onSkip={onSkipSection} skipDisabled={submitting} />
			</div>
		);
	}

	return (
		<div className="relative space-y-6" aria-busy={submitting}>
			{overlay}
			<h2 className="text-xl font-semibold text-foreground">
				{t("store_setup_wizard_rsvp_done_heading")}
			</h2>
			<p className="text-sm text-muted-foreground">
				{t("store_setup_wizard_rsvp_done_body")}
			</p>
			<Button variant="outline" className="h-11 touch-manipulation" asChild>
				<Link href={`/storeAdmin/${storeId}/rsvp-settings`}>
					{t("store_setup_wizard_rsvp_configure_more")}
				</Link>
			</Button>
			<Button
				type="button"
				className="h-11 w-full touch-manipulation sm:ml-3 sm:w-auto"
				onClick={onAdvance}
			>
				{t("store_setup_wizard_continue")}
			</Button>
			<WizardStepFooter onSkip={onSkipSection} skipDisabled={submitting} />
		</div>
	);
}

function WizardStepFooter({
	onSkip,
	skipDisabled,
}: {
	onSkip: () => void;
	skipDisabled?: boolean;
}) {
	const { t } = useTranslation();
	return (
		<div className="pt-4">
			<Button
				type="button"
				variant="ghost"
				className="h-11 text-muted-foreground touch-manipulation"
				onClick={onSkip}
				disabled={skipDisabled}
			>
				{t("store_setup_wizard_skip_section")}
			</Button>
		</div>
	);
}
