import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

const secret = process.env.AUTH_SECRET;

if (!secret || secret.length < 32) {
  throw new Error("AUTH_SECRET harus minimal 32 karakter.");
}

export const auth = betterAuth({
  secret,
  baseURL: process.env.BETTER_AUTH_URL,

  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: { enabled: true, minPasswordLength: 8 },

  user: {
    additionalFields: {
      role: {
        type: ["ADMIN", "AUDITOR", "USER"],
        required: false,
        defaultValue: "USER",
        input: false,
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },

  advanced: { database: { generateId: "uuid" } },

  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },

  plugins: [nextCookies()],
});
