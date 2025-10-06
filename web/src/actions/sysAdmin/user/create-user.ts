"use server";

import { updateUserSettingsSchema } from "@/actions/sysAdmin/user/user.validation";
import { adminActionClient } from "@/utils/actions/safe-action";

export const createUserAction = adminActionClient
	.metadata({ name: "createUser" })
	.schema(updateUserSettingsSchema)
	.action(async ({ parsedInput: { id } }) => {
		/*
			const newUser = await authClient.admin.createUser({
				email: email as string,
				name: name,
				role: role as "user" | "admin" | ("user" | "admin")[],
				password: password as string,
			});

			id = newUser.data?.user.id || "";
			*/

		// user is created from client side, here we create related user object
		if (!id) {
			throw new Error("failed to create user");
		}

		//const result = await createRelatedUserObjectAction(id);

		//console.log("result", result);

		return null;
	});
