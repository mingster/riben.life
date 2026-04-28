"use server";

import {
	submitReserveWithGoogleFeed,
	validateReserveWithGoogleFeedPayload,
} from "@/lib/reserve-with-google";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { generateReserveWithGoogleFeedData } from "./generate-feed";
import { submitReserveWithGoogleFeedSchema } from "./submit-feed.validation";

export const submitReserveWithGoogleFeedAction = storeActionClient
	.metadata({ name: "submitReserveWithGoogleFeed" })
	.schema(submitReserveWithGoogleFeedSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const generated = await generateReserveWithGoogleFeedData({
			storeId,
			environment: parsedInput.environment,
		});

		const validation = validateReserveWithGoogleFeedPayload(generated.payload);
		if (!validation.isValid) {
			throw new SafeError(
				"Feed validation failed. Resolve errors before submit.",
			);
		}

		const submitResult = await submitReserveWithGoogleFeed({
			environment: parsedInput.environment,
			payload: generated.payload,
		});

		const now = getUtcNowEpoch();
		const feedRun = await sqlClient.reserveWithGoogleFeedRun.update({
			where: { id: generated.feedRun.id },
			data: {
				status: submitResult.status === "submitted" ? "submitted" : "exported",
				submittedAt: submitResult.submittedAt,
				artifactPath: submitResult.artifactPath ?? null,
				updatedAt: now,
			},
		});

		return {
			feedRun,
			submitResult,
		};
	});
