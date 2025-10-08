// LINK - https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices
//import { PrismaClient as mongoPrismaClient } from "@prisma-mongo/prisma/client";

import { PrismaClient as sqlPrismaClient } from "@prisma/client";
//import { withAccelerate } from "@prisma/extension-accelerate";
//import { withOptimize } from "@prisma/extension-optimize";

const prismaClientSingleton = () => {
	//return new sqlPrismaClient().$extends(withOptimize({ apiKey: process.env.OPTIMIZE_API_KEY as string}));
	return new sqlPrismaClient({
		datasourceUrl: process.env.POSTGRES_PRISMA_URL,
		log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
	});
	//return new sqlPrismaClient().$extends(withAccelerate());
};

declare global {
	var client: undefined | ReturnType<typeof prismaClientSingleton>;
	//var mongo: mongoPrismaClient | undefined;
}

export const sqlClient = globalThis.client ?? prismaClientSingleton();
//export const mongoClient = globalThis.mongo || new mongoPrismaClient();

if (process.env.NODE_ENV !== "production") {
	globalThis.client = sqlClient;
	//globalThis.mongo = new mongoPrismaClient();
}
