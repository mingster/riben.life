export function isAdmin({ email }: { email?: string | null }) {
	if (!email) return false;
	return process.env.ADMINS?.includes(email);
}
