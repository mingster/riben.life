import Knock from "@knocklabs/node";

if (!process.env.KNOCK_API_KEY) {
	throw new Error("KNOCK_API_KEY environment variable is required");
}

export const knockClient = new Knock({
	apiKey: process.env.KNOCK_API_KEY,
});
