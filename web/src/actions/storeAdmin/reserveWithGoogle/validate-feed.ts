"use server";

import { validateReserveWithGoogleFeedPayload } from "@/lib/reserve-with-google";
import { storeActionClient } from "@/utils/actions/safe-action";
import { generateReserveWithGoogleFeedData } from "./generate-feed";
import { validateReserveWithGoogleFeedSchema } from "./validate-feed.validation";

export const validateReserveWithGoogleFeedAction = storeActionClient
	.metadata({ name: "validateReserveWithGoogleFeed" })
	.schema(validateReserveWithGoogleFeedSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const generated = await generateReserveWithGoogleFeedData({
			storeId,
			environment: parsedInput.environment,
		});
		const validation = validateReserveWithGoogleFeedPayload(generated.payload);
		return {
			validation,
			payload: generated.payload,
			feedRun: generated.feedRun,
		};
	});
