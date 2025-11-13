import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DataTableDraggable } from "@/components/datatable-draggable";

import { auth } from "@/lib/auth";

import { ChartAreaInteractive } from "./components/chart-area-interactive";
import { columns } from "./components/columns";
import { SectionCards } from "./components/section-cards";

import data from "./data.json";
import { Role } from "@/types/enum";
import Container from "@/components/ui/container";

export default async function Page() {
	// check user session
	const session = await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	});

	let canAccess = false;
	// if user is admin or affiliate, they can access the page
	if (
		session &&
		(session.user.role === Role.admin || session.user.role === Role.owner)
	) {
		canAccess = true;
	}

	if (!canAccess) {
		redirect("/signIn/?callbackUrl=/storeAdmin");
		return <></>;
	}

	return (
		<Container>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="px-4 lg:px-6 pb-1">
					<SectionCards />
				</div>
				<div className="px-4 lg:px-6">
					<ChartAreaInteractive />
				</div>
				<DataTableDraggable columns={columns} data={data} />
			</div>
		</Container>
	);
}
