"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { IconActivity, IconClock, IconTrendingUp } from "@tabler/icons-react";

interface SystemHealthProps {
	queueSize: number;
	avgProcessingTime: number;
	successRate: number;
}

export function SystemHealth({
	queueSize,
	avgProcessingTime,
	successRate,
}: SystemHealthProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>System Health</CardTitle>
				<CardDescription>Current system performance metrics</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<IconActivity className="h-4 w-4 text-muted-foreground" />
						<span className="text-sm font-medium">Queue Size</span>
					</div>
					<span className="text-lg font-semibold">
						{queueSize.toLocaleString()}
					</span>
				</div>

				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<IconClock className="h-4 w-4 text-muted-foreground" />
						<span className="text-sm font-medium">Avg Processing Time</span>
					</div>
					<span className="text-lg font-semibold">
						{avgProcessingTime.toFixed(1)}s
					</span>
				</div>

				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<IconTrendingUp className="h-4 w-4 text-muted-foreground" />
						<span className="text-sm font-medium">Success Rate</span>
					</div>
					<span
						className={`text-lg font-semibold ${
							successRate >= 95
								? "text-green-600"
								: successRate >= 80
									? "text-yellow-600"
									: "text-red-600"
						}`}
					>
						{successRate}%
					</span>
				</div>
			</CardContent>
		</Card>
	);
}
