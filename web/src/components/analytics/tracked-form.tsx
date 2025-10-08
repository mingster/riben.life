"use client";

import { FormEvent, ReactNode } from "react";
import { sendGAEvent } from "@next/third-parties/google";

interface TrackedFormProps {
	children: ReactNode;
	onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
	formName: string;
	className?: string;
	method?: "GET" | "POST";
	action?: string;
}

export function TrackedForm({
	children,
	onSubmit,
	formName,
	className,
	method = "POST",
	action,
}: TrackedFormProps) {
	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		// Track form submission (production only)
		if (process.env.NODE_ENV === "production") {
			sendGAEvent({
				event: "form_submit",
				event_category: "form",
				form_name: formName,
			});
		}

		// Execute the original onSubmit handler
		if (onSubmit) {
			onSubmit(e);
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			className={className}
			method={method}
			action={action}
		>
			{children}
		</form>
	);
}
