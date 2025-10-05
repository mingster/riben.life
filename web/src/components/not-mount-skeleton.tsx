"use client";

import { Skeleton } from "./ui/skeleton";

export const NotMountSkeleton = () => {
	return (
		<div>
			<div className="space-y-4 pb-2">
				<Skeleton className="min-h-10 w-[100%]" />
			</div>
			<div className="space-y-4 pb-2">
				<Skeleton className="min-h-72 w-[100%]" />
			</div>
			<div className="space-y-4 pb-2">
				<Skeleton className="min-h-10 w-[100%]" />
			</div>
		</div>
	);
};
