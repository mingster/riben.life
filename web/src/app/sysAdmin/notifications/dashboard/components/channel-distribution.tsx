"use client";

interface ChannelDistributionProps {
	data: Array<{
		channel: string;
		count: number;
	}>;
}

export function ChannelDistribution({ data }: ChannelDistributionProps) {
	// Get max count for scaling
	const maxCount = Math.max(...data.map((d) => d.count), 1);

	// Channel display names
	const channelNames: Record<string, string> = {
		onsite: "On-Site",
		email: "Email",
		line: "LINE",
		whatsapp: "WhatsApp",
		wechat: "WeChat",
		sms: "SMS",
		telegram: "Telegram",
		push: "Push",
	};

	return (
		<div className="space-y-4">
			{data.length === 0 ? (
				<p className="text-sm text-muted-foreground">No data available</p>
			) : (
				data.map((item) => {
					const percentage = (item.count / maxCount) * 100;
					const displayName = channelNames[item.channel] || item.channel;

					return (
						<div key={item.channel} className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="font-medium">{displayName}</span>
								<span className="text-muted-foreground">
									{item.count.toLocaleString()}
								</span>
							</div>
							<div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
								<div
									className="h-full bg-primary transition-all"
									style={{ width: `${percentage}%` }}
								/>
							</div>
						</div>
					);
				})
			)}
		</div>
	);
}
