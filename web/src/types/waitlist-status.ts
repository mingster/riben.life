/**
 * Mirrors Prisma `WaitListStatus`. Import from here in `"use client"` modules instead of
 * `@prisma/client` so the client bundle does not include Prisma's Node runtime.
 */
export const WaitListStatus = {
	waiting: "waiting",
	called: "called",
	cancelled: "cancelled",
	no_show: "no_show",
} as const;

export type WaitListStatus =
	(typeof WaitListStatus)[keyof typeof WaitListStatus];
