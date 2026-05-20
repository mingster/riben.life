"use client";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import type { WizardStepId } from "@/lib/store-setup-wizard/wizard-steps";

import { WizardProgress } from "./wizard-progress";

interface WizardShellProps {
	storeName: string;
	progressSteps: WizardStepId[];
	currentStep: WizardStepId;
	onFinishLater: () => void;
	finishLaterDisabled?: boolean;
	children: React.ReactNode;
}

export function WizardShell({
	storeName,
	progressSteps,
	currentStep,
	onFinishLater,
	finishLaterDisabled,
	children,
}: WizardShellProps) {
	const { t } = useTranslation();

	return (
		<div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
			<div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
						{t("store_setup_wizard_title")}
					</h1>
					<p className="mt-2 text-sm text-muted-foreground sm:text-base">
						{t("store_setup_wizard_subtitle")}
					</p>
					<p className="mt-1 text-sm font-medium text-foreground">
						{storeName}
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					className="h-11 shrink-0 touch-manipulation sm:h-10"
					onClick={onFinishLater}
					disabled={finishLaterDisabled}
				>
					{t("store_setup_wizard_finish_later")}
				</Button>
			</div>

			{progressSteps.length > 1 ? (
				<div className="mb-10">
					<WizardProgress steps={progressSteps} currentStep={currentStep} />
				</div>
			) : null}

			{children}
		</div>
	);
}
