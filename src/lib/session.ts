import "server-only";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) return null;

  return prisma.user.findFirst({
    where: { id: session.user.id, isActive: true },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
}

export async function clearSession() {
  await auth.api.signOut({ headers: await headers() });
}
