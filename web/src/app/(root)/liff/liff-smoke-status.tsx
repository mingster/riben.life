"use client";

import { useLiff } from "@/providers/liff-provider";

export function LiffSmokeStatus() {
	const { ready, error, isInClient } = useLiff();

	if (!ready) {
		return <p className="text-sm text-muted-foreground">Initializing LIFF…</p>;
	}

	return (
		<dl className="mt-4 grid gap-2 text-sm">
			<div className="flex justify-between gap-4">
				<dt className="text-muted-foreground">In LINE in-app</dt>
				<dd>{isInClient ? "yes" : "no"}</dd>
			</div>
			{error ? (
				<div className="flex justify-between gap-4">
					<dt className="text-muted-foreground">Init error</dt>
					<dd className="text-destructive">{error}</dd>
				</div>
			) : null}
		</dl>
	);
}
