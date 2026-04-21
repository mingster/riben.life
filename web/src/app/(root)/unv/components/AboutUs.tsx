"use client";

import { cn } from "@/lib/utils";

export function AboutUs({ className, ...props }: { className?: string }) {
	return (
		<section
			id="aboutUs"
			className={cn("w-full content-around relative scroll-mt-28", className)}
			aria-label="About Us and Contact Information"
			{...props}
		>
			<div className="min-h-screen flex flex-col font-minimal">
				{/* Main Content */}
				<main className="flex-1 flex flex-col justify-center items-center px-4 py-16 md:py-24 font-minimal">
					{/* Large Heading */}
					<h1 className="text-7xl md:text-9xl font-light tracking-tight mb-1 text-foreground">
						riben.life
					</h1>
					<h2 className="text-2xl md:text-4xl font-light tracking-tight mb-16 text-gray-400">
						YOM Days
					</h2>

					{/* Tagline */}
					<div className="max-w-2xl text-center mb-20">
						<p className="text-xl md:text-2xl font-light leading-relaxed text-foreground/80">
							はインターネット的なモノづくりの仕組みを発明し、日常に溶け込むような永く続く、それでいて新しい価値を創り続けます。時代のうねりを生み出しながら、多くの人が自由で幸せに生きることができる社会を目指します。
						</p>
					</div>

					{/* Company Information */}
					<div className="w-full max-w-xl space-y-10">
						<div className="space-y-8">
							<div>
								<h2 className="text-xs font-medium uppercase tracking-widest text-foreground/50 mb-3">
									Company Name
								</h2>
								<p className="text-base text-foreground">riben.life</p>
							</div>

							<div>
								<h2 className="text-xs font-medium uppercase tracking-widest text-foreground/50 mb-3">
									Representative
								</h2>
								<p className="text-base text-foreground">Your Name</p>
							</div>

							<div>
								<h2 className="text-xs font-medium uppercase tracking-widest text-foreground/50 mb-3">
									Established
								</h2>
								<p className="text-base text-foreground">1998</p>
							</div>

							<div>
								<h2 className="text-xs font-medium uppercase tracking-widest text-foreground/50 mb-3">
									Location
								</h2>
								<p className="text-base text-foreground">Your Address Here</p>
							</div>
						</div>
					</div>
				</main>
			</div>
		</section>
	);
}
