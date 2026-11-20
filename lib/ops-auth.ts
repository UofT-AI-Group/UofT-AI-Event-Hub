import "server-only";
import { cookies } from "next/headers";
import { verifyOpsSession } from "@/lib/security";

export const OPS_COOKIE = "conferencex_ops";

export async function isOpsAuthenticated(): Promise<boolean> {
  const token = (await cookies()).get(OPS_COOKIE)?.value;
  return verifyOpsSession(token, process.env.OPS_PASSWORD ?? "");
}
