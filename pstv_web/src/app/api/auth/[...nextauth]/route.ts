//import { handlers } from "@/auth"; // Referring to the auth.ts we just created
//export const { GET, POST } = handlers;

import { authOptions } from "@/auth";
import NextAuth from "next-auth";

// use authOptions
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

/*
// use getNextAuthOptions
import { NextApiRequest, NextApiResponse } from 'next';
export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  return await NextAuth(req, res, getNextAuthOptions(req));
}
*/
