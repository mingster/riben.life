export type WizardStepId =
	| "systems"
	| "rsvp"
	| "order"
	| "waitlist"
	| "complete";

export type WizardSystems = {
	useOrderSystem: boolean;
	acceptReservation: boolean;
	waitlistEnabled: boolean;
};

const SYSTEM_STEP_ORDER: WizardStepId[] = ["rsvp", "order", "waitlist"];

/** Steps shown in the progress bar (systems + enabled systems only). */
export function getWizardProgressSteps(systems: WizardSystems): WizardStepId[] {
	const steps: WizardStepId[] = ["systems"];
	if (systems.acceptReservation) {
		steps.push("rsvp");
	}
	if (systems.useOrderSystem) {
		steps.push("order");
	}
	if (systems.waitlistEnabled) {
		steps.push("waitlist");
	}
	return steps;
}

/** First system mini-wizard after systems selection. */
export function getFirstSystemStep(
	systems: WizardSystems,
): WizardStepId | "complete" {
	for (const step of SYSTEM_STEP_ORDER) {
		if (step === "rsvp" && systems.acceptReservation) {
			return "rsvp";
		}
		if (step === "order" && systems.useOrderSystem) {
			return "order";
		}
		if (step === "waitlist" && systems.waitlistEnabled) {
			return "waitlist";
		}
	}
	return "complete";
}

/** Next step after current system step, or complete. */
export function getNextWizardStep(
	current: WizardStepId,
	systems: WizardSystems,
): WizardStepId {
	if (current === "systems") {
		return getFirstSystemStep(systems);
	}
	const enabled = SYSTEM_STEP_ORDER.filter((id) => {
		if (id === "rsvp") {
			return systems.acceptReservation;
		}
		if (id === "order") {
			return systems.useOrderSystem;
		}
		if (id === "waitlist") {
			return systems.waitlistEnabled;
		}
		return false;
	});
	const idx = enabled.indexOf(current as (typeof enabled)[number]);
	if (idx < 0 || idx >= enabled.length - 1) {
		return "complete";
	}
	return enabled[idx + 1];
}

export function isValidWizardStep(
	value: string | null | undefined,
): value is WizardStepId {
	return (
		value === "systems" ||
		value === "rsvp" ||
		value === "order" ||
		value === "waitlist" ||
		value === "complete"
	);
}

export function parseWizardStep(
	value: string | null | undefined,
	systems: WizardSystems,
): WizardStepId {
	if (!isValidWizardStep(value)) {
		return "systems";
	}
	if (value === "rsvp" && !systems.acceptReservation) {
		return getFirstSystemStep(systems);
	}
	if (value === "order" && !systems.useOrderSystem) {
		return getFirstSystemStep(systems);
	}
	if (value === "waitlist" && !systems.waitlistEnabled) {
		return getFirstSystemStep(systems);
	}
	return value;
}

export function wizardStepHref(storeId: string, step: WizardStepId): string {
	return `/storeAdmin/${storeId}/wizard?step=${step}`;
}
