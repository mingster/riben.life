import Link from "next/link";

import Container from "@/components/ui/container";

/** Placeholder installer entry referenced by sysAdmin when reference data is missing. */
export default function InstallPage() {
	return (
		<Container className="prose dark:prose-invert py-12">
			<h1>Platform install</h1>
			<p>
				Load default countries, currencies, and locales from the project
				installer.
			</p>
			<pre className="rounded-md bg-muted p-4 text-sm">
				{`bun run install:platform
# without Stripe (CI / no STRIPE_SECRET_KEY):
bun run bin/install.ts --skip-stripe`}
			</pre>
			<p>
				<Link href="/sysAdmin" className="text-primary underline">
					Back to sys admin
				</Link>
			</p>
		</Container>
	);
}
