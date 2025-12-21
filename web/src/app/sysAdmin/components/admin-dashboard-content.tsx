"use client";

import {
	toastError,
	toastInfo,
	toastSuccess,
	toastWarning,
} from "@/components/toaster";
import { Button } from "@/components/ui/button";

import { ArrowRightIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import logger from "@/lib/logger";

export const AdminDashboardContent = () => {
	return (
		<>
			<div className="container relative pb-10">
				<section className="mx-auto flex max-w-[980px] flex-col items-center gap-2 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-6">
					<h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
						Admin Dashboard
					</h2>
					<span className="max-w-[750px] text-center text-lg font-light text-foreground">
						管理員後台
					</span>
					<div className="flex w-full items-center justify-center space-x-4 py-4 md:pb-6">
						<Button variant="outline" asChild>
							<Link href="#">
								Demo
								<ArrowRightIcon className="ml-2" />
							</Link>
						</Button>

						<Button
							onClick={() => {
								toastSuccess({
									title: "Scheduled: Catch up",
									description: "Friday, February 10, 2023 at 5:57 PM",
								});
							}}
						>
							Show success toast
						</Button>
						<Button
							variant="secondary"
							onClick={() => {
								toastWarning({
									title: "Scheduled: Catch up",
									description: "Friday, February 10, 2023 at 5:57 PM",
								});
							}}
						>
							Show warning toast
						</Button>

						<Button
							variant="destructive"
							onClick={() => {
								toastError({
									title: "Scheduled: Catch up",
									description: "Friday, February 10, 2023 at 5:57 PM",
								});
							}}
						>
							Show error toast
						</Button>

						<Button
							variant="outline"
							onClick={() => {
								toastInfo({
									title: "Scheduled: Catch up",
									description: "Friday, February 10, 2023 at 5:57 PM",
								});
							}}
						>
							Show info toast
						</Button>
					</div>
				</section>
				<div className="relative flex w-full justify-center"> </div>
			</div>
		</>
	);
};
