
"use server";

import { hashPassword } from "better-auth/crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";

export async function createUserAction(formData: FormData) {
  // Pastikan hanya admin yang dapat membuat pengguna.
  const admin = await currentUser();

  if (!admin) {
    redirect("/login");
  }

  if (admin.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(
    formData.get("confirmPassword") || ""
  );
  const role = String(formData.get("role") || "USER");

  // Validasi input.
  if (!name || name.length > 100) {
    redirect("/admin?status=invalid-name");
  }

  if (
    !email ||
    email.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    redirect("/admin?status=invalid-email");
  }

  if (password.length < 8 || password.length > 128) {
    redirect("/admin?status=invalid-password");
  }

  if (password !== confirmPassword) {
    redirect("/admin?status=password-mismatch");
  }

  if (role !== "ADMIN" && role !== "USER") {
    redirect("/admin?status=invalid-role");
  }

  // Cek email duplikat.
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    redirect("/admin?status=email-exists");
  }

  // Gunakan algoritma hashing Better Auth.
  const hashedPassword = await hashPassword(password);

  try {
    await prisma.$transaction(async (tx) => {
      // Buat pengguna.
      const user = await tx.user.create({
        data: {
          name,
          email,
          role,
          isActive: true,
          emailVerified: false,
        },
      });

      // Buat kredensial login Better Auth.
      await tx.account.create({
        data: {
          accountId: user.id,
          providerId: "credential",
          userId: user.id,
          password: hashedPassword,
        },
      });

      // Catat aktivitas admin.
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "CREATE",
          entityType: "USER",
          entityId: user.id,
          details: {
            name,
            email,
            role,
          },
        },
      });
    });
  } catch (error) {
    console.error("Create user error:", error);

    redirect("/admin?status=create-failed");
  }

  revalidatePath("/admin");
  redirect("/admin?status=created");
}
