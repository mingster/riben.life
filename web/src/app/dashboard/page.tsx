import { DataTableDraggable } from "@/components/datatable-draggable";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import logger from "@/lib/logger";
import { AppSidebar } from "./components/app-sidebar";
import { ChartAreaInteractive } from "./components/chart-area-interactive";
import { columns } from "./components/columns";
import { SectionCards } from "./components/section-cards";
import { SiteHeader } from "./components/site-header";
import data from "./data.json";
import { Suspense } from "react";
import { Loader } from "@/components/loader";

export default async function DashboardPage() {
	const log = logger.child({ module: "DashboardPage" });
	/*
		// check user session
		const session = await auth.api.getSession({
			headers: await headers(), // you need to pass the headers object.
		});
	
		const canAccess = await isAdmin({ email: session?.user.email });
	
		if (!canAccess) {
			redirect("/signIn/?callbackUrl=/dashboard");
		}
	 */
	return (
		<Suspense fallback={<Loader />}>
			<SidebarProvider
				style={
					{
						"--sidebar-width": "calc(var(--spacing) * 72)",
						"--header-height": "calc(var(--spacing) * 12)",
					} as React.CSSProperties
				}
			>
				<AppSidebar variant="inset" />
				<SidebarInset>
					<SiteHeader />
					<div className="flex flex-1 flex-col">
						<div className="@container/main flex flex-1 flex-col gap-2">
							<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
								<div className="px-4 lg:px-6 pb-1">
									<SectionCards />
								</div>
								<div className="px-4 lg:px-6">
									<ChartAreaInteractive />
								</div>
								<DataTableDraggable columns={columns} data={data} />
							</div>
						</div>
					</div>
				</SidebarInset>
			</SidebarProvider>
		</Suspense>
	);
}
