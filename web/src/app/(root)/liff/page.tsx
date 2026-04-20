import { LiffSmokeStatus } from "@/app/(root)/liff/liff-smoke-status";

export default function LiffRootPage() {
	return (
		<main className="mx-auto max-w-lg px-3 py-10 sm:px-4">
			<h1 className="font-serif text-2xl font-light tracking-tight">LIFF</h1>
			<p className="mt-2 text-sm text-muted-foreground">
				This segment is for LINE in-app flows. Open from LINE or use QR with a
				LIFF endpoint pointing at this host.
			</p>
			<LiffSmokeStatus />
		</main>
	);
}
