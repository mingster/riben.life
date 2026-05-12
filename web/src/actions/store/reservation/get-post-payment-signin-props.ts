import type { Rsvp } from "@/types";
import { sqlClient } from "@/lib/prismadb";
import { signRsvpPostPaymentToken } from "@/utils/rsvp-post-payment-token";
import { transformPrismaDataForJson } from "@/utils/utils";

interface PostPaymentSignInProps {
	rsvp: Rsvp | null;
	postPaymentSignInToken?: string;
}

export async function getPostPaymentSignInProps(
	orderId: string,
): Promise<PostPaymentSignInProps> {
	const rsvp = await sqlClient.rsvp.findFirst({
		where: { orderId },
	});

	if (!rsvp) {
		return { rsvp: null };
	}

	const transformedRsvp = { ...rsvp } as Rsvp;
	transformPrismaDataForJson(transformedRsvp);

	const postPaymentSignInToken =
		rsvp.customerId && rsvp.orderId
			? signRsvpPostPaymentToken({
					orderId: rsvp.orderId,
					userId: rsvp.customerId,
				})
			: undefined;

	return {
		rsvp: transformedRsvp,
		postPaymentSignInToken,
	};
}
