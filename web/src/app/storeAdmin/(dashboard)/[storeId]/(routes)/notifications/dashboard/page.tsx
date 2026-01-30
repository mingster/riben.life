import { Suspense } from "react";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { getStoreWithRelations } from "@/lib/store-access";
import { redirect } from "next/navigation";
import { transformPrismaDataForJson } from "@/utils/utils";
import { ClientNotificationDashboard } from "@/app/sysAdmin/notifications/dashboard/components/client-dashboard";

type Params = Promise<{ storeId: string }>;

export default async function StoreNotificationDashboardPage(props: {
	params: Params;
}) {
	const params = await props.params;
	const storeId = params.storeId;

	const storeResult = await getStoreWithRelations(storeId, {});
	if (!storeResult) {
		redirect("/storeAdmin");
	}

	const now = Date.now();
	const last24h = BigInt(now - 24 * 60 * 60 * 1000);
	const last7d = BigInt(now - 7 * 24 * 60 * 60 * 1000);
	const last30d = BigInt(now - 30 * 24 * 60 * 60 * 1000);

	const storeFilter = { storeId };

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
		sqlClient.messageQueue.count({
			where: {
				...storeFilter,
				createdAt: { gte: last24h },
			},
		}),
		sqlClient.messageQueue.count({
			where: {
				...storeFilter,
				createdAt: { gte: last7d },
			},
		}),
		sqlClient.messageQueue.count({
			where: {
				...storeFilter,
				createdAt: { gte: last30d },
			},
		}),
		sqlClient.messageQueue.count({
			where: {
				...storeFilter,
				sentOn: null,
			},
		}),
		sqlClient.notificationDeliveryStatus.count({
			where: {
				status: "failed",
				Notification: { storeId },
			},
		}),
		sqlClient.notificationDeliveryStatus.groupBy({
			by: ["channel"],
			where: {
				Notification: { storeId },
				createdAt: { gte: last24h },
			},
			_count: { id: true },
		}),
		sqlClient.emailQueue.count({
			where: {
				storeId,
				sentOn: null,
			},
		}),
		sqlClient.messageQueue.findMany({
			where: storeFilter,
			take: 20,
			orderBy: { createdAt: "desc" },
			include: {
				DeliveryStatuses: {
					take: 5,
					orderBy: { createdAt: "desc" },
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
		sqlClient.notificationDeliveryStatus.findMany({
			where: {
				Notification: { storeId },
				createdAt: { gte: last24h },
			},
			select: {
				status: true,
				createdAt: true,
				updatedAt: true,
			},
		}),
	]);

	const totalDeliveries = deliveryStatuses.length;
	const successfulDeliveries = deliveryStatuses.filter(
		(s) =>
			s.status === "sent" || s.status === "delivered" || s.status === "read",
	).length;
	const successRate =
		totalDeliveries > 0
			? Math.round((successfulDeliveries / totalDeliveries) * 100 * 10) / 10
			: 0;

	const processedDeliveries = deliveryStatuses.filter(
		(s) => s.status !== "pending" && s.updatedAt,
	);
	let avgProcessingTime = 0;
	if (processedDeliveries.length > 0) {
		const totalProcessingTime = processedDeliveries.reduce((sum, d) => {
			return sum + (Number(d.updatedAt) - Number(d.createdAt));
		}, 0);
		avgProcessingTime = totalProcessingTime / processedDeliveries.length / 1000;
	}

	const channelStats = channelDistribution.map((c) => ({
		channel: c.channel,
		count: c._count.id,
	}));

	transformPrismaDataForJson(recentNotifications);

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
