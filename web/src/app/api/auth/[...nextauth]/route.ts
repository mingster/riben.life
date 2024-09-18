 // v5 config
import { handlers } from "@/auth";
export const { GET, POST } = handlers;

/* v 4.x config
import { authOptions } from "@/auth";
import NextAuth from "next-auth";

// use authOptions
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
*/
