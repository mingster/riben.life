"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns";
import { IconBell } from "@tabler/icons-react";
import { ChannelStatusBadge } from "@/components/notification/channel-status-badge";

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
												<ChannelStatusBadge
													key={idx}
													channel={status.channel as any}
													status={status.status as any}
													size="sm"
												/>
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
