/**
 * Authentication and Authorization Utilities
 *
 * Provides reusable functions for checking authentication and authorization
 * across the application.
 */

import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import type { Session } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

// Route constants
const ROUTES = {
	SIGNIN: "/signIn",
	ERROR_403: "/error/?code=403",
} as const;

// Allowed roles
export type UserRole = Role;

/**
 * Require user to be authenticated
 *
 * @returns Session object if authenticated
 * @throws Redirects to signin page if not authenticated
 */
export async function requireAuth(): Promise<Session> {
	const headersList = await headers();
	const session = await auth.api.getSession({ headers: headersList });

	if (!session?.user?.id) {
		logger.warn("Authentication required - redirecting to signin");

		const pathname =
			headersList.get("x-current-path") ||
			headersList.get("x-invoke-path") ||
			"/";
		const callbackUrl = encodeURIComponent(pathname);

		redirect(`${ROUTES.SIGNIN}?callbackUrl=${callbackUrl}`);
	}

	return session;
}

/**
 * Require user to have one of the allowed roles
 *
 * @param session - User session to check
 * @param allowedRoles - Array of allowed roles
 * @throws Redirects to 403 error page if role not allowed
 */
export function requireRole(session: Session, allowedRoles: UserRole[]): void {
	if (!allowedRoles.includes(session.user.role as UserRole)) {
		logger.warn("Insufficient permissions", {
			metadata: {
				userId: session.user.id,
				role: session.user.role as string,
				requiredRoles: allowedRoles,
			},
		});

		redirect(ROUTES.ERROR_403);
	}
}

/**
 * Require user to be authenticated with specific role
 * Convenience function combining requireAuth and requireRole
 *
 * @param allowedRoles - Array of allowed roles
 * @returns Session object if authenticated and authorized
 */
export async function requireAuthWithRole(
	allowedRoles: UserRole[],
): Promise<Session> {
	const session = await requireAuth();
	requireRole(session, allowedRoles);
	return session;
}
