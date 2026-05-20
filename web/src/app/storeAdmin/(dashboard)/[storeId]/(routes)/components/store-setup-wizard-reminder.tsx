"use client";

import Link from "next/link";
import { IconSettings } from "@tabler/icons-react";
import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface StoreSetupWizardReminderProps {
	storeId: string;
}

export function StoreSetupWizardReminder({
	storeId,
}: StoreSetupWizardReminderProps) {
	const { t } = useTranslation();

	return (
		<Card className="mb-6 border-primary/30 bg-primary/5">
			<CardHeader className="pb-2">
				<div className="flex items-start gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
						<IconSettings className="h-5 w-5" />
					</div>
					<div>
						<CardTitle className="text-base">
							{t("store_setup_wizard_reminder_title")}
						</CardTitle>
						<CardDescription className="mt-1">
							{t("store_setup_wizard_reminder_body")}
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<Button className="h-11 w-full touch-manipulation sm:w-auto" asChild>
					<Link href={`/storeAdmin/${storeId}/wizard?step=systems`}>
						{t("store_setup_wizard_reminder_cta")}
					</Link>
				</Button>
			</CardContent>
		</Card>
	);
}
