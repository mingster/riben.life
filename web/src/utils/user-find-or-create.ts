import { searchUsersAction } from "@/actions/storeAdmin/serviceStaff/search-users";
import { authClient } from "@/lib/auth-client";

/**
 * Normalize phone to digits only for comparison.
 */
export function normalizePhone(phone: string): string {
	return (phone || "").replace(/[^0-9]/g, "");
}

/**
 * Generate email for new user when not provided.
 * Same logic as EditCustomer and service staff import.
 */
export function generateEmailForNewUser(input: {
	name?: string;
	email?: string;
	phone?: string;
}): string {
	const emailTrimmed = (input.email || "").trim();
	if (emailTrimmed) return emailTrimmed;
	const phoneTrimmed = (input.phone || "").trim();
	if (phoneTrimmed) {
		return `${normalizePhone(phoneTrimmed)}@phone.riben.life`;
	}
	const sanitizedName = (input.name || "")
		.replace(/[^a-zA-Z0-9]/g, "")
		.toLowerCase()
		.substring(0, 20);
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 10);
	return `${sanitizedName}-${timestamp}-${random}@import.riben.life`;
}

/**
 * Search user model by phone or email; if found, return userId.
 * If not found, create new user and return userId.
 * Shared logic for EditCustomer and EditServiceStaffDialog.
 */
/**
 * Generate a random password for admin-created users when not provided.
 */
function generateRandomPassword(): string {
	return `Rb${Math.random().toString(36).slice(2, 14)}!${Date.now().toString(36).slice(-4)}`;
}

export async function findOrCreateUserId(
	storeId: string,
	input: {
		name: string;
		email?: string;
		phone?: string;
		password?: string;
	},
): Promise<{ userId: string } | { error: string }> {
	const phoneTrimmed = (input.phone || "").trim();
	const emailTrimmed = (input.email || "").trim();
	const phoneDigits = normalizePhone(phoneTrimmed);
	const searchQuery = phoneTrimmed || emailTrimmed;

	// Search by phone or email before creation
	if (searchQuery) {
		const searchResult = await searchUsersAction(storeId, {
			query: searchQuery,
		});
		const matched = searchResult?.data?.users?.find((u) => {
			const phoneMatch =
				phoneDigits &&
				(u.phoneNumber || "").replace(/[^0-9]/g, "") === phoneDigits;
			const emailMatch =
				emailTrimmed &&
				(u.email || "").trim().toLowerCase() === emailTrimmed.toLowerCase();
			return phoneMatch || emailMatch;
		});
		if (matched) {
			return { userId: matched.id };
		}
	}

	// Create new user - use provided password or generate one
	const password = input.password?.trim() || generateRandomPassword();
	const finalEmail = generateEmailForNewUser({
		name: input.name,
		email: input.email,
		phone: input.phone,
	});
	const newUser = await authClient.admin.createUser({
		email: finalEmail,
		name: input.name,
		password,
	});
	const userId = newUser.data?.user?.id;
	if (!userId) {
		return { error: "Failed to create user" };
	}
	return { userId };
}
