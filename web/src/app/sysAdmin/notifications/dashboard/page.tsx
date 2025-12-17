"use server";

import { Suspense } from "react";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { ClientNotificationDashboard } from "./components/client-dashboard";

export default async function NotificationDashboardPage() {
	const now = Date.now();
	const nowEpoch = BigInt(now);

	// Calculate time ranges
	const last24h = BigInt(now - 24 * 60 * 60 * 1000);
	const last7d = BigInt(now - 7 * 24 * 60 * 60 * 1000);
	const last30d = BigInt(now - 30 * 24 * 60 * 60 * 1000);

	// Fetch stats in parallel for better performance
	const [
		total24h,
		total7d,
		total30d,
		pendingCount,
		failedCount,
		channelDistribution,
		queueSize,
		recentNotifications,
		deliveryStatuses,
	] = await Promise.all([
		// Total notifications sent in last 24h
		sqlClient.messageQueue.count({
			where: {
				createdAt: {
					gte: last24h,
				},
			},
		}),

		// Total notifications sent in last 7d
		sqlClient.messageQueue.count({
			where: {
				createdAt: {
					gte: last7d,
				},
			},
		}),

		// Total notifications sent in last 30d
		sqlClient.messageQueue.count({
			where: {
				createdAt: {
					gte: last30d,
				},
			},
		}),

		// Pending notifications (not sent yet)
		sqlClient.messageQueue.count({
			where: {
				sentOn: null,
			},
		}),

		// Failed notifications (from delivery status)
		sqlClient.notificationDeliveryStatus.count({
			where: {
				status: "failed",
			},
		}),

		// Channel distribution (last 24h)
		sqlClient.notificationDeliveryStatus.groupBy({
			by: ["channel"],
			where: {
				createdAt: {
					gte: last24h,
				},
			},
			_count: {
				id: true,
			},
		}),

		// Queue size (pending emails)
		sqlClient.emailQueue.count({
			where: {
				sentOn: null,
			},
		}),

		// Recent notifications (last 20)
		sqlClient.messageQueue.findMany({
			take: 20,
			orderBy: {
				createdAt: "desc",
			},
			include: {
				DeliveryStatuses: {
					take: 5,
					orderBy: {
						createdAt: "desc",
					},
				},
				Recipient: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
				Sender: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		}),

		// All delivery statuses for success rate calculation (last 24h)
		sqlClient.notificationDeliveryStatus.findMany({
			where: {
				createdAt: {
					gte: last24h,
				},
			},
			select: {
				status: true,
				createdAt: true,
				updatedAt: true,
			},
		}),
	]);

	// Calculate success rate
	const totalDeliveries = deliveryStatuses.length;
	const successfulDeliveries = deliveryStatuses.filter(
		(s) =>
			s.status === "sent" || s.status === "delivered" || s.status === "read",
	).length;
	const successRate =
		totalDeliveries > 0
			? Math.round((successfulDeliveries / totalDeliveries) * 100 * 10) / 10
			: 0;

	// Calculate average processing time (time from createdAt to sentOn/deliveredAt)
	const processedDeliveries = deliveryStatuses.filter(
		(s) => s.status !== "pending" && s.updatedAt,
	);
	let avgProcessingTime = 0;
	if (processedDeliveries.length > 0) {
		const totalProcessingTime = processedDeliveries.reduce((sum, d) => {
			const processingTime = Number(d.updatedAt) - Number(d.createdAt);
			return sum + processingTime;
		}, 0);
		avgProcessingTime = totalProcessingTime / processedDeliveries.length / 1000; // Convert to seconds
	}

	// Format channel distribution
	const channelStats = channelDistribution.map((c) => ({
		channel: c.channel,
		count: c._count.id,
	}));

	// Transform BigInt to numbers for JSON serialization
	transformPrismaDataForJson(recentNotifications);

	// Format recent notifications
	const formattedNotifications = recentNotifications.map((n) => ({
		id: n.id,
		subject: n.subject,
		recipientName: n.Recipient.name || n.Recipient.email || "Unknown",
		createdAt: Number(n.createdAt),
		sentOn: n.sentOn ? Number(n.sentOn) : null,
		statuses: n.DeliveryStatuses.map((s) => ({
			channel: s.channel,
			status: s.status,
		})),
	}));

	const stats = {
		total24h,
		total7d,
		total30d,
		pendingCount,
		failedCount,
		successRate,
		channelDistribution: channelStats,
		queueSize,
		avgProcessingTime: Math.round(avgProcessingTime * 10) / 10,
		recentNotifications: formattedNotifications,
	};

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<ClientNotificationDashboard initialStats={stats} />
			</Container>
		</Suspense>
	);
}
