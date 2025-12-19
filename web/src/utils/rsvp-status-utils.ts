import { RsvpStatus } from "@/types/enum";

/**
 * Get color classes based on RSVP status
 * @param status - The RSVP status (number)
 * @param includeInteractions - If true, includes hover and active states (for buttons), if false, returns base classes only (for legend)
 * @returns CSS class string for the status
 */
export function getRsvpStatusColorClasses(
	status: number | null | undefined,
	includeInteractions: boolean = true,
): string {
	// Normalize status to always be a number (default to Pending)
	const normalizedStatus = status != null ? Number(status) : RsvpStatus.Pending;

	// Ensure it's a valid number
	if (isNaN(normalizedStatus)) {
		return includeInteractions
			? "bg-gray-100 hover:bg-gray-200 active:bg-gray-300 border-l-2 border-l-gray-400"
			: "bg-gray-100 border-l-2 border-l-gray-400";
	}

	// Base color classes for each status
	let baseClasses: string;
	let hoverClasses: string = "";
	let activeClasses: string = "";

	switch (normalizedStatus) {
		case RsvpStatus.Pending:
			baseClasses = "bg-gray-300 text-gray-700 border-l-2 border-l-gray-500";
			hoverClasses = "hover:bg-gray-200";
			activeClasses = "active:bg-gray-300";
			break;
		case RsvpStatus.ReadyToConfirm:
			baseClasses = "bg-blue-100 text-gray-700 border-l-2 border-l-blue-500";
			hoverClasses = "hover:bg-blue-200";
			activeClasses = "active:bg-blue-300";
			break;
		case RsvpStatus.Seated:
			baseClasses = "bg-green-100 text-gray-700 border-l-2 border-l-green-500";
			hoverClasses = "hover:bg-green-200";
			activeClasses = "active:bg-green-300";
			break;
		case RsvpStatus.Completed:
			baseClasses =
				"bg-emerald-800 text-gray-300 border-l-2 border-l-emerald-600";
			hoverClasses = "hover:bg-emerald-200";
			activeClasses = "active:bg-emerald-300";
			break;
		case RsvpStatus.Cancelled:
			baseClasses = "bg-red-100 text-gray-700 border-l-2 border-l-red-500";
			hoverClasses = "hover:bg-red-200";
			activeClasses = "active:bg-red-300";
			break;
		case RsvpStatus.NoShow:
			baseClasses = "bg-rose-500 text-gray-300 border-l-2 border-l-rose-600";
			hoverClasses = "hover:bg-rose-200";
			activeClasses = "active:bg-rose-300";
			break;
		default:
			baseClasses = "bg-gray-100 text-gray-700 border-l-2 border-l-gray-400";
			hoverClasses = "hover:bg-gray-200";
			activeClasses = "active:bg-gray-300";
			break;
	}

	return includeInteractions
		? `${baseClasses} ${hoverClasses} ${activeClasses}`
		: baseClasses;
}
