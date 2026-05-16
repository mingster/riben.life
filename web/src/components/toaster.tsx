import {
	IconInfoSquare,
	IconInfoTriangle,
	IconThumbDown,
	IconThumbUp,
} from "@tabler/icons-react";
import { Toaster as SonnerToaster, toast } from "sonner";

function playSuccessSound() {
	try {
		const ctx = new AudioContext();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.frequency.value = 880;
		gain.gain.setValueAtTime(0.1, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
		osc.start(ctx.currentTime);
		osc.stop(ctx.currentTime + 0.3);
	} catch {}
}

export function toastSuccess(options: { title?: string; description: string }) {
	playSuccessSound();
	return toast.success(options.title || "✅ Success", {
		description: options.description,
		duration: 10_000,
		icon: <IconThumbUp className="h-5 w-5" />,
		style: {
			backgroundColor: "var(--primary)",
			color: "var(--primary-foreground)",
		},
	});
}

export function toastError(options: { title?: string; description: string }) {
	return toast.error(options.title || "❌ Error", {
		description: options.description,
		duration: 10_000,
		icon: <IconThumbDown className="h-5 w-5" />,
		style: {
			backgroundColor: "var(--destructive)",
			color: "var(--destructive-foreground)",
		},
	});
}

export function toastWarning(options: { title?: string; description: string }) {
	return toast(options.title || "⚠️ Warning!", {
		description: options.description,
		duration: 10_000,
		icon: <IconInfoTriangle className="h-5 w-5" />,
		style: {
			backgroundColor: "var(--warning)",
			color: "var(--warning-foreground)",
		},
	});
}

export function toastInfo(options: {
	title: string;
	description: string;
	duration?: number;
}) {
	return toast(options.title || "ℹ️ Info", {
		icon: <IconInfoSquare className="h-5 w-5" />,
		description: options.description,
		duration: options.duration,
		style: {
			backgroundColor: "var(--secondary)",
			color: "var(--secondary-foreground)",
		},
	});
}

export const Toaster = SonnerToaster;
