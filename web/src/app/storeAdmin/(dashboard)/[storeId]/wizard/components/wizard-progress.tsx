"use client";

import { useTranslation } from "@/app/i18n/client";
import type { WizardStepId } from "@/lib/store-setup-wizard/wizard-steps";
import { cn } from "@/lib/utils";

const STEP_LABEL_KEYS: Record<WizardStepId, string> = {
	systems: "store_setup_wizard_step_systems",
	rsvp: "store_setup_wizard_step_rsvp",
	order: "store_setup_wizard_step_order",
	waitlist: "store_setup_wizard_step_waitlist",
	complete: "store_setup_wizard_step_complete",
};

interface WizardProgressProps {
	steps: WizardStepId[];
	currentStep: WizardStepId;
}

export function WizardProgress({ steps, currentStep }: WizardProgressProps) {
	const { t } = useTranslation();
	const currentIndex = steps.indexOf(currentStep);

	return (
		<nav
			className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
			aria-label="Setup progress"
		>
			{steps.map((step, index) => {
				const isActive = step === currentStep;
				const isDone = currentIndex > index;
				return (
					<div key={step} className="flex items-center gap-2 sm:gap-3">
						<span
							className={cn(
								"inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-semibold sm:h-9 sm:min-w-9 sm:text-sm",
								isActive && "bg-primary text-primary-foreground",
								isDone && !isActive && "bg-primary/20 text-primary",
								!isActive && !isDone && "bg-muted text-muted-foreground",
							)}
						>
							{index + 1}
						</span>
						<span
							className={cn(
								"hidden text-sm font-medium sm:inline",
								isActive ? "text-foreground" : "text-muted-foreground",
							)}
						>
							{t(STEP_LABEL_KEYS[step])}
						</span>
						{index < steps.length - 1 ? (
							<span
								className="hidden h-px w-6 bg-border sm:block sm:w-10"
								aria-hidden
							/>
						) : null}
					</div>
				);
			})}
		</nav>
	);
}
