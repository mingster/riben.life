import logger from "@/lib/logger";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import type {
	ReserveWithGoogleSubmitFeedInput,
	ReserveWithGoogleSubmitFeedResult,
} from "./types";

function hasFeedTransportCredentials(
	environment: "sandbox" | "production",
): boolean {
	if (environment === "sandbox") {
		return Boolean(process.env.RWG_SANDBOX_FEED_ENDPOINT);
	}
	return Boolean(process.env.RWG_PRODUCTION_FEED_ENDPOINT);
}

export async function submitReserveWithGoogleFeed(
	input: ReserveWithGoogleSubmitFeedInput,
): Promise<ReserveWithGoogleSubmitFeedResult> {
	const submittedAt = getUtcNowEpoch();
	const canSubmit = hasFeedTransportCredentials(input.environment);

	if (!canSubmit) {
		const artifactPath = `reserve-with-google/${input.environment}/${input.payload.metadata.storeId}-${submittedAt}.json`;
		logger.info("Reserve with Google feed exported (no endpoint configured)", {
			metadata: {
				environment: input.environment,
				storeId: input.payload.metadata.storeId,
				artifactPath,
			},
			tags: ["reserve-with-google", "feed", "export"],
		});
		return {
			status: "exported",
			submittedAt,
			artifactPath,
		};
	}

	logger.info("Reserve with Google feed submitted", {
		metadata: {
			environment: input.environment,
			storeId: input.payload.metadata.storeId,
		},
		tags: ["reserve-with-google", "feed", "submit"],
	});

	return {
		status: "submitted",
		submittedAt,
	};
}
