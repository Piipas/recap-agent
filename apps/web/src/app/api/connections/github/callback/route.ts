import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { connectGitHubSource } from "@/server/connections/github";
import { finishOAuthFlow } from "@/server/connections/oauth-flow";
import { requireUser } from "@/server/session";

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const params = request.nextUrl.searchParams;
  const codeVerifier = await finishOAuthFlow("github", user.id, params.get("state"));
  const code = params.get("code");

  if (params.get("error") || !code || !codeVerifier) redirect("/connections?error=github");

  try {
    await connectGitHubSource(user.id, code, codeVerifier);
  } catch (error) {
    console.error("GitHub source connection failed", error);
    redirect("/connections?error=github");
  }
  redirect("/connections?connected=github");
}
