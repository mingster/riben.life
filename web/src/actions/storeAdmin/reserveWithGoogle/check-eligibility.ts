"use server";

import { checkReserveWithGoogleEligibility } from "@/lib/reserve-with-google";
import { storeActionClient } from "@/utils/actions/safe-action";
import { checkReserveWithGoogleEligibilitySchema } from "./check-eligibility.validation";

export const checkReserveWithGoogleEligibilityAction = storeActionClient
	.metadata({ name: "checkReserveWithGoogleEligibility" })
	.schema(checkReserveWithGoogleEligibilitySchema)
	.action(async ({ bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const eligibility = await checkReserveWithGoogleEligibility(storeId);
		return { eligibility };
	});
