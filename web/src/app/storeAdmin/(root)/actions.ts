"use server";
import { revalidatePath } from "next/cache";
import logger from "@/lib/logger";

// NOTE: createStore has been moved to @/actions/storeAdmin/store/create-store.ts
// following the standard CRUD pattern

export const deleteStore = async (id: FormData) => {
	// Extracting Store ID from formData
	const _StoreId = id.get("id");
	try {
		// Deleting the Store with the specified ID
		//await StoreModel.deleteOne({ _id: StoreId });
		// Triggering revalidation of the specified path ("/")
		revalidatePath("/");

		// Returning a success message after deleting the Store
		return "Store deleted";
	} catch (error) {
		logger.error(error);

		// Returning an error message if Store deletion fails
		return { message: "error deleting Store" };
	}
};
