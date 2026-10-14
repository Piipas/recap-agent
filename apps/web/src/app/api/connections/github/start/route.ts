import { redirect } from "next/navigation";
import { githubAuthorizeUrl } from "@/server/connections/github";
import { startOAuthFlow } from "@/server/connections/oauth-flow";
import { requireUser } from "@/server/session";

export async function GET() {
  const user = await requireUser();
  const { state, codeChallenge } = await startOAuthFlow("github", user.id);
  redirect(githubAuthorizeUrl(state, codeChallenge));
}
