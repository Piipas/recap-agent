import "server-only";
import { type MailboxProviderSlug, mailboxProviders } from "@recap/core/mailboxes/providers";
import { callbackUrl } from "@/server/connections/oauth-flow";

export const mailboxCallbackPath = (slug: MailboxProviderSlug) => `/api/mailboxes/${slug}/callback`;

export const mailboxAuthorizeUrl = (slug: MailboxProviderSlug, state: string, codeChallenge: string) => {
  const config = mailboxProviders[slug];
  const url = new URL(config.authorizeUrl);
  url.search = new URLSearchParams({
    client_id: config.clientId(),
    redirect_uri: callbackUrl(mailboxCallbackPath(slug)),
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    ...config.authorizeParams,
  }).toString();
  return url.toString();
};
