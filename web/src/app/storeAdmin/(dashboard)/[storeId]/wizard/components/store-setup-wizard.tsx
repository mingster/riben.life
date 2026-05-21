"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { UpdateStoreBasicInput } from "@/actions/storeAdmin/settings/update-store-basic.validation";
import { completeStoreSetupWizardAction } from "@/actions/storeAdmin/setup-wizard/complete-store-setup-wizard";
import { dismissStoreSetupWizardAction } from "@/actions/storeAdmin/setup-wizard/dismiss-store-setup-wizard";
import type { UpdateWaitlistSettingsInput } from "@/actions/storeAdmin/waitlist/update-waitlist-settings.validation";
import { useTranslation } from "@/app/i18n/client";
import { toastError } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	getFirstSystemStep,
	getNextWizardStep,
	getWizardProgressSteps,
	parseWizardStep,
	wizardStepHref,
	type WizardStepId,
	type WizardSystems,
} from "@/lib/store-setup-wizard/wizard-steps";

import { WizardOrderSteps } from "./wizard-order-steps";
import { WizardRsvpSteps } from "./wizard-rsvp-steps";
import { WizardShell } from "./wizard-shell";
import { WizardSystemSelection } from "./wizard-system-selection";
import { WizardWaitlistSteps } from "./wizard-waitlist-steps";

interface StoreSetupWizardProps {
	storeId: string;
	storeName: string;
	initialStep: string;
	systems: WizardSystems;
	storeBasic: UpdateStoreBasicInput;
	rsvpMode: number;
	paymentMethodCount: number;
	shippingMethodCount: number;
	facilityCount: number;
	featuredProductCount: number;
	serviceStaffCount: number;
	waitlistSettings: UpdateWaitlistSettingsInput | null;
	wizardCompletedAt: string | null;
}

export function StoreSetupWizard({
	storeId,
	storeName,
	initialStep,
	systems: initialSystems,
	storeBasic,
	rsvpMode,
	paymentMethodCount,
	shippingMethodCount,
	facilityCount,
	featuredProductCount,
	serviceStaffCount,
	waitlistSettings,
	wizardCompletedAt,
}: StoreSetupWizardProps) {
	const { t } = useTranslation();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [systems, setSystems] = useState<WizardSystems>(initialSystems);
	const [busy, setBusy] = useState(false);

	const stepParam = searchParams.get("step") ?? initialStep;
	const currentStep = useMemo(
		() => parseWizardStep(stepParam, systems),
		[stepParam, systems],
	);

	const progressSteps = useMemo(
		() => getWizardProgressSteps(systems),
		[systems],
	);

	const goToStep = useCallback(
		(step: WizardStepId) => {
			router.replace(wizardStepHref(storeId, step));
		},
		[router, storeId],
	);

	const finishLater = useCallback(async () => {
		setBusy(true);
		try {
			const result = await dismissStoreSetupWizardAction(storeId, {});
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			router.push(`/storeAdmin/${storeId}/dashboard`);
		} catch (err: unknown) {
			toastError({
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setBusy(false);
		}
	}, [storeId, router]);

	const completeWizard = useCallback(async () => {
		setBusy(true);
		try {
			const result = await completeStoreSetupWizardAction(storeId, {});
			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}
			router.push(`/storeAdmin/${storeId}/dashboard`);
		} catch (err: unknown) {
			toastError({
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setBusy(false);
		}
	}, [storeId, router]);

	const advanceFromStep = useCallback(
		(from: WizardStepId) => {
			const next = getNextWizardStep(from, systems);
			if (next === "complete") {
				void completeWizard();
			} else {
				goToStep(next);
			}
		},
		[systems, completeWizard, goToStep],
	);

	const onSystemsSaved = useCallback(
		(nextSystems: WizardSystems) => {
			setSystems(nextSystems);
			const first = getFirstSystemStep(nextSystems);
			goToStep(first);
		},
		[goToStep],
	);

	const defaultWaitlist: UpdateWaitlistSettingsInput = {
		enabled: true,
		requireSignIn: true,
		requireName: true,
		requirePhone: true,
		canGetNumBefore: 0,
		missedTurnEnabled: true,
		missedTurnMinutesAfterCall: 5,
		missedTurnRequeuePositionFromTop: 3,
		showQueueOnWaitlistPage: false,
	};

	useEffect(() => {
		if (wizardCompletedAt) {
			router.replace(`/storeAdmin/${storeId}/dashboard`);
		}
	}, [wizardCompletedAt, storeId, router]);

	if (wizardCompletedAt) {
		return null;
	}

	return (
		<WizardShell
			storeName={storeName}
			progressSteps={progressSteps}
			currentStep={currentStep === "complete" ? "systems" : currentStep}
			onFinishLater={() => void finishLater()}
			finishLaterDisabled={busy}
		>
			{currentStep === "systems" ? (
				<WizardSystemSelection
					storeId={storeId}
					initialSystems={systems}
					onSaved={onSystemsSaved}
				/>
			) : null}

			{currentStep === "rsvp" ? (
				<WizardRsvpSteps
					storeId={storeId}
					initialRsvpMode={rsvpMode}
					facilityCount={facilityCount}
					serviceStaffCount={serviceStaffCount}
					onAdvance={() => advanceFromStep("rsvp")}
					onSkipSection={() => advanceFromStep("rsvp")}
				/>
			) : null}

			{currentStep === "order" ? (
				<WizardOrderSteps
					storeId={storeId}
					storeBasic={storeBasic}
					featuredProductCount={featuredProductCount}
					paymentMethodCount={paymentMethodCount}
					shippingMethodCount={shippingMethodCount}
					onAdvance={() => advanceFromStep("order")}
					onSkipSection={() => advanceFromStep("order")}
				/>
			) : null}

			{currentStep === "waitlist" ? (
				<WizardWaitlistSteps
					storeId={storeId}
					initialSettings={waitlistSettings ?? defaultWaitlist}
					onAdvance={() => advanceFromStep("waitlist")}
					onSkipSection={() => advanceFromStep("waitlist")}
				/>
			) : null}

			{currentStep === "complete" ? (
				<div className="space-y-6">
					<h2 className="text-xl font-semibold">
						{t("store_setup_wizard_complete_heading")}
					</h2>
					<p className="text-sm text-muted-foreground">
						{t("store_setup_wizard_complete_body")}
					</p>
					<Button
						type="button"
						className="h-11 w-full touch-manipulation sm:w-auto"
						disabled={busy}
						onClick={() => void completeWizard()}
					>
						{t("store_setup_wizard_go_dashboard")}
					</Button>
				</div>
			) : null}
		</WizardShell>
	);
}
