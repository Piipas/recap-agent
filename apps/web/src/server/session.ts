import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** Every page, action and route handler that touches user data starts here. */
export const requireUser = async () => {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session.user;
};
