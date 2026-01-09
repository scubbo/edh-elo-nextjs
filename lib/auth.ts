import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import prisma from "@/lib/db/client";
import { ADMIN_EMAIL } from "@/lib/constants";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const authSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;

// Only enforce required env vars in production or when explicitly needed
const isDevelopment = process.env.NODE_ENV === 'development';

if (!authSecret && !isDevelopment) {
  throw new Error(
    "Missing NEXTAUTH_SECRET (or AUTH_SECRET) environment variable.",
  );
}

if ((!googleClientId || !googleClientSecret) && !isDevelopment) {
  throw new Error("Missing Google OAuth environment variables.");
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: authSecret || 'development-secret-key',
  session: {
    strategy: "database",
  },
  providers: [
    GoogleProvider({
      clientId: googleClientId || 'placeholder-client-id',
      clientSecret: googleClientSecret || 'placeholder-client-secret',
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};

export const getAuthSession = () => getServerSession(authOptions);

export async function isAdmin(): Promise<boolean> {
  const session = await getAuthSession();
  return session?.user?.email === ADMIN_EMAIL;
}
