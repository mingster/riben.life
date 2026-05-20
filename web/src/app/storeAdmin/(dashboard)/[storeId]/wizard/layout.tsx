import Link from "next/link";
import { Logo } from "@/components/logo";
import LanguageToggler from "@/components/language-toggler";
import { ThemeToggler } from "@/components/theme-toggler";

export default function StoreSetupWizardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-dvh flex flex-col bg-background">
			<header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
				<div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
					<Link
						href="/"
						className="flex shrink-0 items-center"
						aria-label="Home"
					>
						<Logo className="h-8 w-auto" />
					</Link>
					<div className="flex items-center gap-2">
						<ThemeToggler />
						<LanguageToggler />
					</div>
				</div>
			</header>
			<main className="flex-1">{children}</main>
		</div>
	);
}
