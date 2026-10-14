import { mailboxProviderSlugs } from "@recap/core/mailboxes/providers";
import { notFound, redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { finishOAuthFlow } from "@/server/connections/oauth-flow";
import { connectMailbox } from "@/server/mailboxes/connect";
import { requireUser } from "@/server/session";

export async function GET(request: NextRequest, context: RouteContext<"/api/mailboxes/[provider]/callback">) {
  const user = await requireUser();
  const slug = z.enum(mailboxProviderSlugs).safeParse((await context.params).provider);
  if (!slug.success) notFound();

  const params = request.nextUrl.searchParams;
  const codeVerifier = await finishOAuthFlow(slug.data, user.id, params.get("state"));
  const code = params.get("code");
  if (params.get("error") || !code || !codeVerifier) redirect(`/connections?error=${slug.data}`);

  try {
    await connectMailbox(user.id, slug.data, code, codeVerifier);
  } catch (error) {
    console.error(`Mailbox connection failed (${slug.data})`, error);
    redirect(`/connections?error=${slug.data}`);
  }
  redirect(`/connections?connected=${slug.data}`);
}
