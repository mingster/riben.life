import { Suspense } from "react";
import { GlobalNavbar } from "@/components/global-navbar";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";

export default function FaqPage() {
	const title = "FAQ";

	return (
		<Suspense fallback={<Loader />}>
			<div className="min-h-screen">
				<GlobalNavbar title={title} />
				<Container className="font-minimal bg-[url('/img/noise.147fc0e.gif')] bg-repeat pt-6 pb-16 dark:bg-none sm:pt-10">
					<main className="mx-auto max-w-2xl space-y-10">
						<div>
							<h1 className=" text-3xl font-light tracking-tight sm:text-4xl">
								Help & FAQ
							</h1>
							<p className="mt-3 text-sm text-muted-foreground">
								Short answers for a small catalog; expand as support volume
								grows.
							</p>
						</div>
						<dl className="space-y-8">
							<div>
								<dt className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
									Orders
								</dt>
								<dd className="mt-2 text-sm leading-relaxed text-foreground/90">
									Order history appears in your account after checkout. For
									payment issues, keep your Stripe receipt and contact support.
								</dd>
							</div>
							<div>
								<dt className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
									Customization
								</dt>
								<dd className="mt-2 text-sm leading-relaxed text-foreground/90">
									Use the customizer to preview the riben.life pattern on
									eligible products. Configuration is saved on your cart line
									and on the order.
								</dd>
							</div>
							<div>
								<dt className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
									Shipping
								</dt>
								<dd className="mt-2 text-sm leading-relaxed text-foreground/90">
									Shipping options depend on your store settings. Pickup may be
									added in a later release.
								</dd>
							</div>
						</dl>
					</main>
				</Container>
			</div>
		</Suspense>
	);
}
