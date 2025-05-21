import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/utils/utils";
//import type { Account, Session, StoreOrder } from "@prisma/client";
//import { Role } from "@/types/enum";
//import type { Role } from "@prisma/client";
import { UserEditTabs } from "./tabs";
import type { User } from "@/types";

const UserEditPage = async (props: { params: Promise<{ userId: string }> }) => {
	const params = await props.params;
	const user = (await sqlClient.user.findUnique({
		where: {
			id: params.userId,
		},
		include: {
			Orders: true,
			Session: true,
			Account: true,
		},
	})) as User;

	//console.log(`UserEditPage: ${JSON.stringify(user)}`);

	const action = "Edit";
	//if (user === null) action = "New";

	transformDecimalsToNumbers(user);

	return (
		<div className="flex-col">
			<div className="flex-1 space-y-4 p-8 pt-6">
				<UserEditTabs initialData={user} action={action} />
			</div>
		</div>
	);
};

export default UserEditPage;
