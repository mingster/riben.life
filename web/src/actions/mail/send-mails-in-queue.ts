import { sendMail } from "./send-mail";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";

export interface EmailProcessingResult {
	success: boolean;
	emailId: string;
	duration: number;
	error?: string;
}

// Process emails in batches with parallel sending
export const sendMailsInQueue = async (
	batchSize: number = 10,
	maxConcurrent: number = 3,
) => {
	const startTime = Date.now();
	const log = logger.child({ module: "sendMailsInQueue" });

	try {
		const now = getUtcNowEpoch();

		// Get emails from queue (only unclaimed so multiple workers don't send the same row)
		const candidates = await sqlClient.emailQueue.findMany({
			where: {
				sentOn: null,
				claimedAt: null,
				sendTries: { lt: 3 },
			},
			orderBy: [{ priority: "desc" }, { createdOn: "asc" }],
			take: batchSize,
		});

		if (candidates.length === 0) {
			return { processed: 0, success: 0, failed: 0 };
		}

		// Claim rows: only process rows we successfully claim (prevents duplicate sends)
		const toProcess: typeof candidates = [];
		for (const email of candidates) {
			const { count } = await sqlClient.emailQueue.updateMany({
				where: { id: email.id, claimedAt: null },
				data: { claimedAt: now },
			});
			if (count === 1) {
				toProcess.push(email);
			}
		}

		if (toProcess.length === 0) {
			return { processed: 0, success: 0, failed: 0 };
		}

		const results: EmailProcessingResult[] = [];

		for (let i = 0; i < toProcess.length; i += maxConcurrent) {
			const batch = toProcess.slice(i, i + maxConcurrent);

			const batchPromises = batch.map(async (email) => {
				const emailStartTime = Date.now();

				try {
					const success = await sendMail(
						email.fromName || "",
						email.from,
						email.to,
						email.subject,
						email.textMessage,
						email.htmMessage,
						email.toName || "",
						email.cc || "",
						email.bcc || "",
					);

					const duration = Date.now() - emailStartTime;

					if (success) {
						await sqlClient.emailQueue.update({
							where: { id: email.id },
							data: { sentOn: getUtcNowEpoch() },
						});

						return {
							success: true,
							emailId: email.id,
							duration,
						};
					} else {
						// Release claim and increment retry so it can be retried later
						await sqlClient.emailQueue.update({
							where: { id: email.id },
							data: {
								claimedAt: null,
								sendTries: { increment: 1 },
							},
						});

						return {
							success: false,
							emailId: email.id,
							duration,
							error: "Send failed",
						};
					}
				} catch (error) {
					const duration = Date.now() - emailStartTime;

					// Release claim and increment retry
					await sqlClient.emailQueue.update({
						where: { id: email.id },
						data: {
							claimedAt: null,
							sendTries: { increment: 1 },
						},
					});

					return {
						success: false,
						emailId: email.id,
						duration,
						error: (error as Error).message,
					};
				}
			});

			// Wait for current batch to complete
			const batchResults = await Promise.allSettled(batchPromises);
			results.push(
				...batchResults.map((result) =>
					result.status === "fulfilled"
						? result.value
						: {
								success: false,
								emailId: "unknown",
								duration: 0,
								error: result.reason?.message || "Unknown error",
							},
				),
			);

			// Small delay between batches to prevent overwhelming the SMTP server
			if (i + maxConcurrent < toProcess.length) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}

		// Calculate statistics
		const successful = results.filter((r) => r.success).length;
		const failed = results.filter((r) => !r.success).length;
		const totalDuration = Date.now() - startTime;
		const avgDuration =
			results.reduce((sum, r) => sum + r.duration, 0) / results.length;

		// Log results
		// log.info(`Email queue processing completed in ${totalDuration}ms`);
		// log.info(`Total emails: ${results.length}`);
		// log.info(`Successful emails: ${successful}`);
		// log.info(`Failed emails: ${failed}`);
		// log.info(`Average duration: ${Math.round(avgDuration)}ms`);

		// Log failed emails for debugging
		const failedEmails = results.filter((r) => !r.success);
		if (failedEmails.length > 0) {
			log.warn(`Failed emails: ${failedEmails.length}`);
			log.warn(
				`Failed emails: ${failedEmails.map((f) => ({ id: f.emailId, error: f.error }))}`,
			);
		}

		return {
			processed: results.length,
			success: successful,
			failed: failed,
			duration: totalDuration,
		};
	} catch (error) {
		const duration = Date.now() - startTime;
		log.error(`Email queue processing failed in ${duration}ms`);

		return {
			processed: 0,
			success: 0,
			failed: 0,
			error: (error as Error).message,
		};
	}
};

// Utility function to get queue statistics
export const getQueueStats = async () => {
	const [pending, failed, sent] = await Promise.all([
		sqlClient.emailQueue.count({
			where: {
				sentOn: null,
				claimedAt: null,
				sendTries: { lt: 3 },
			},
		}),
		sqlClient.emailQueue.count({
			where: { sentOn: null, sendTries: { gte: 3 } },
		}),
		sqlClient.emailQueue.count({
			where: { sentOn: { not: null } },
		}),
	]);

	return { pending, failed, sent };
};
