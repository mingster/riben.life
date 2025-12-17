"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { IconBell } from "@tabler/icons-react";

interface RecentActivityProps {
	notifications: Array<{
		id: string;
		subject: string;
		recipientName: string;
		createdAt: number;
		sentOn: number | null;
		statuses: Array<{
			channel: string;
			status: string;
		}>;
	}>;
}

const statusColors: Record<string, string> = {
	pending: "bg-gray-500",
	sent: "bg-blue-500",
	delivered: "bg-green-500",
	read: "bg-green-600",
	failed: "bg-red-500",
	bounced: "bg-orange-500",
};

const statusLabels: Record<string, string> = {
	pending: "Pending",
	sent: "Sent",
	delivered: "Delivered",
	read: "Read",
	failed: "Failed",
	bounced: "Bounced",
};

export function RecentActivity({ notifications }: RecentActivityProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Recent Activity</CardTitle>
				<CardDescription>Latest notifications and their status</CardDescription>
			</CardHeader>
			<CardContent>
				{notifications.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No recent notifications
					</p>
				) : (
					<div className="space-y-4">
						{notifications.map((notification) => {
							const createdDate = new Date(notification.createdAt);
							const overallStatus =
								notification.statuses.length > 0
									? notification.statuses[0].status
									: notification.sentOn
										? "sent"
										: "pending";

							return (
								<div
									key={notification.id}
									className="flex items-start justify-between space-x-4 border-b pb-4 last:border-0 last:pb-0"
								>
									<div className="flex-1 space-y-1">
										<div className="flex items-center gap-2">
											<IconBell className="h-4 w-4 text-muted-foreground" />
											<p className="text-sm font-medium">
												{notification.subject}
											</p>
										</div>
										<p className="text-xs text-muted-foreground">
											To: {notification.recipientName}
										</p>
										<div className="flex flex-wrap gap-1">
											{notification.statuses.map((status, idx) => (
												<Badge
													key={idx}
													variant="secondary"
													className={`text-xs ${statusColors[status.status] || "bg-gray-500"} text-white`}
												>
													{status.channel}:{" "}
													{statusLabels[status.status] || status.status}
												</Badge>
											))}
										</div>
									</div>
									<div className="text-right text-xs text-muted-foreground">
										{format(createdDate, "MMM d, HH:mm")}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
