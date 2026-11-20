"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OPS_COOKIE } from "@/lib/ops-auth";
import { createOpsSession, OPS_SESSION_SECONDS, passwordMatches } from "@/lib/security";

export async function login(formData: FormData) {
  const password = process.env.OPS_PASSWORD ?? "";
  if (!password) redirect("/ops/login?error=setup");
  const candidate = formData.get("password");
  if (typeof candidate !== "string" || !passwordMatches(candidate, password)) redirect("/ops/login?error=password");
  (await cookies()).set(OPS_COOKIE, createOpsSession(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: OPS_SESSION_SECONDS,
  });
  redirect("/ops");
}

export async function logout() {
  (await cookies()).delete(OPS_COOKIE);
  redirect("/ops/login");
}
