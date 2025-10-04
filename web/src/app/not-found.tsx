import Link from "next/link";
import { IconHome, IconArrowLeft } from "@tabler/icons-react";

export default function NotFound() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background">
			<div className="mx-auto flex max-w-md flex-col items-center text-center">
				<div className="mb-8 text-6xl font-bold text-muted-foreground">404</div>
				<h1 className="mb-4 text-2xl font-semibold text-foreground">
					Page Not Found
				</h1>
				<p className="mb-8 text-muted-foreground">
					Sorry, we couldn't find the page you're looking for. It might have
					been moved, deleted, or you entered the wrong URL.
				</p>
				<div className="flex gap-4">
					<Link
						href="/"
						className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
					>
						<IconHome className="h-4 w-4" />
						Go Home
					</Link>
					<Link
						href="javascript:history.back()"
						className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
					>
						<IconArrowLeft className="h-4 w-4" />
						Go Back
					</Link>
				</div>
			</div>
		</div>
	);
}
