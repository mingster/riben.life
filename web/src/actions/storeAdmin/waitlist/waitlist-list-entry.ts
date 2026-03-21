/**
 * Waitlist row shape returned by {@link listWaitlistAction} after JSON transform (BigInt → number).
 */
export interface WaitlistListEntry {
	id: string;
	storeId: string;
	queueNumber: number;
	sessionBlock: string;
	verificationCode: string;
	numOfAdult: number;
	numOfChild: number;
	customerId: string | null;
	name: string | null;
	lastName: string | null;
	phone: string | null;
	message: string | null;
	status: string;
	waitTimeMs?: number | null;
	createdBy: string | null;
	createdAt: number;
	updatedAt: number;
	notifiedAt: number | null;
	orderId: string | null;
}
