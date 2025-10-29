import { Toaster as SonnerToaster, toast } from "sonner";
import { IconAlertTriangle } from "@tabler/icons-react";

export function toastSuccess(options: { title?: string; description: string }) {
	return toast.success(options.title || "Success", {
		description: options.description,
	});
}

export function toastError(options: { title?: string; description: string }) {
	return toast.error(options.title || "Error", {
		description: options.description,
		duration: 10_000,
		icon: <IconAlertTriangle className="h-5 w-5" />,
		style: {
			backgroundColor: "var(--destructive)",
			color: "var(--destructive-foreground)",
		},
	});
}

export function toastInfo(options: {
	title: string;
	description: string;
	duration?: number;
}) {
	return toast(options.title, {
		description: options.description,
		duration: options.duration,
	});
}

export const Toaster = SonnerToaster;
