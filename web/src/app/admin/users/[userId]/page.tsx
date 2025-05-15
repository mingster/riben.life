import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/utils/utils";
import type { Account, Session, StoreOrder } from "@prisma/client";
//import { Role } from "@/types/enum";
import type { Role } from "@prisma/client";
import { UserEditTabs } from "./tabs";

const UserEditPage = async (props: { params: Promise<{ userId: string }> }) => {
	const params = await props.params;
	const user = await sqlClient.user.findUnique({
		where: {
			id: params.userId,
		},
		include: {
			Orders: true,
			Session: true,
			Account: true,
		},
	});

	//console.log(`UserEditPage: ${JSON.stringify(user)}`);

	const action = "Edit";
	//if (user === null) action = "New";

	const initialData: {
		id: string;
		name: string | null;
		username: string | null;
		email: string | null;
		emailVerified: Date | null;
		image: string | null;
		createdAt: Date;
		updatedAt: Date;
		isActive: boolean;
		//role: string | null;
		role: Role | null;
		locale: string | null;
		stripeCustomerId: string | null;
		Order: StoreOrder[];
		Session: Session[];
		Account: Account | null;
	} | null = user
		? {
				id: user.id,
				name: user.name,
				username: user.username,
				email: user.email,
				emailVerified: user.emailVerified,
				image: user.image,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
				isActive: user.isActive,
				role: user.role,
				locale: user.locale,
				stripeCustomerId: user.stripeCustomerId,
				Order: user.Orders,
				Session: user.Session,
				Account: user.Account,
			}
		: null;

	transformDecimalsToNumbers(initialData);

	return (
		<div className="flex-col">
			<div className="flex-1 space-y-4 p-8 pt-6">
				<UserEditTabs initialData={initialData} action={action} />
			</div>
		</div>
	);
};

export default UserEditPage;
