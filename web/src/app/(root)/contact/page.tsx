import { Suspense } from "react";
import { GlobalNavbar } from "@/components/global-navbar";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";

export default function ContactPage() {
	const title = "Contact";

	return (
		<Suspense fallback={<Loader />}>
			<div className="min-h-screen">
				<GlobalNavbar title={title} />
				<Container className="font-minimal bg-[url('/img/noise.147fc0e.gif')] bg-repeat pt-6 pb-16 dark:bg-none sm:pt-10">
					<main className="mx-auto max-w-xl space-y-6">
						<h1 className="font-serif text-3xl font-light tracking-tight sm:text-4xl">
							Contact
						</h1>
						<p className="text-sm leading-relaxed text-muted-foreground">
							For order support, customization questions, or partnerships, reach
							out using the channel your team configures (email, form, or help
							desk). This page is a placeholder until a ticketing or contact
							form is wired.
						</p>
						<p className="text-sm text-muted-foreground">
							General inquiries:{" "}
							<a
								href="mailto:support@riben.life.example"
								className="underline underline-offset-4 hover:text-foreground"
							>
								support@riben.life.example
							</a>
						</p>
					</main>
				</Container>
			</div>
		</Suspense>
	);
}
