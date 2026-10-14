import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { startOAuthFlow } from "@/server/connections/oauth-flow";
import { mailboxAuthorizeUrl, mailboxProviderSlugs } from "@/server/mailboxes/providers";
import { requireUser } from "@/server/session";

export async function GET(_request: Request, context: RouteContext<"/api/mailboxes/[provider]/start">) {
  const user = await requireUser();
  const slug = z.enum(mailboxProviderSlugs).safeParse((await context.params).provider);
  if (!slug.success) notFound();

  const { state, codeChallenge } = await startOAuthFlow(slug.data, user.id);
  redirect(mailboxAuthorizeUrl(slug.data, state, codeChallenge));
}
