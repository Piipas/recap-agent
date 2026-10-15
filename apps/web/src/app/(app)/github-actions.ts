"use server";

import { z } from "zod";
import { listGitHubOrgRepos, listGitHubOrgs } from "@/server/connections/github";
import { requireUser } from "@/server/session";

export type ListResult = { ok: true; items: string[] } | { ok: false; error: string };

const orgLogin = z.string().regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/);

const toResult = async (load: () => Promise<string[]>): Promise<ListResult> => {
  try {
    return { ok: true, items: await load() };
  } catch (error) {
    console.error("GitHub listing failed", error);
    return { ok: false, error: error instanceof Error ? error.message : "GitHub could not be reached." };
  }
};

export async function listOrgsAction(): Promise<ListResult> {
  const user = await requireUser();
  return toResult(() => listGitHubOrgs(user.id));
}

export async function listOrgReposAction(org: string): Promise<ListResult> {
  const user = await requireUser();
  const parsed = orgLogin.safeParse(org);
  if (!parsed.success) return { ok: false, error: "Invalid organization." };
  return toResult(() => listGitHubOrgRepos(user.id, parsed.data));
}
