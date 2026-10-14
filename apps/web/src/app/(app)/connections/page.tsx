import { prisma } from "@recap/db";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmAction } from "@/components/confirm-action";
import { GitHubIcon } from "@/components/icons/providers";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/server/session";
import { disconnectGitHubAction, removeGroqKeyAction } from "./actions";
import { GroqKeyForm } from "./groq-key-form";

export const metadata: Metadata = { title: "Connections" };

const errorMessages: Record<string, string> = {
  github: "GitHub could not be connected. Please try again and approve all requested permissions.",
};

const connectedMessages: Record<string, string> = {
  github: "GitHub connected.",
};

export default async function ConnectionsPage({ searchParams }: PageProps<"/connections">) {
  const user = await requireUser();
  const { error, connected } = await searchParams;
  const [github, groqKey] = await Promise.all([
    prisma.gitHubSource.findUnique({ where: { userId: user.id } }),
    prisma.groqKey.findUnique({ where: { userId: user.id } }),
  ]);

  const errorMessage = typeof error === "string" ? errorMessages[error] : undefined;
  const connectedMessage = typeof connected === "string" ? connectedMessages[connected] : undefined;

  return (
    <>
      <PageHeader
        title="Connections"
        description="Where recaps read commits from, which AI key writes them, and which mailboxes send them."
      />

      <div className="grid gap-6">
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Connection failed</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        {connectedMessage ? (
          <Alert>
            <CheckCircle2 />
            <AlertTitle>{connectedMessage}</AlertTitle>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitHubIcon className="size-5" /> GitHub
            </CardTitle>
            <CardDescription>
              Read access to your repositories and organizations, used to collect the day&apos;s commits.
            </CardDescription>
            <CardAction>
              {github ? (
                <Badge variant={github.status === "ACTIVE" ? "secondary" : "destructive"}>
                  {github.status === "ACTIVE" ? "Connected" : "Reconnect needed"}
                </Badge>
              ) : (
                <Badge variant="outline">Not connected</Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            {github?.status === "NEEDS_RECONNECT" ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>GitHub access stopped working</AlertTitle>
                <AlertDescription>{github.lastError ?? "Reconnect to keep generating recaps."}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground text-sm">
                {github ? (
                  <>
                    Connected as <span className="text-foreground font-medium">@{github.login}</span> · scopes{" "}
                    <code className="text-xs">{github.scope}</code>
                  </>
                ) : (
                  <>
                    Requests <code className="text-xs">repo</code>, <code className="text-xs">read:user</code> and{" "}
                    <code className="text-xs">read:org</code>, the same access the CLI asks for.
                  </>
                )}
              </p>
              <div className="flex gap-2">
                <Button asChild variant={github?.status === "ACTIVE" ? "outline" : "default"}>
                  <Link href="/api/connections/github/start" prefetch={false}>
                    {github ? "Reconnect" : "Connect GitHub"}
                  </Link>
                </Button>
                {github ? (
                  <ConfirmAction
                    action={disconnectGitHubAction}
                    title="Disconnect GitHub?"
                    description="The token is revoked and deleted. Scheduled recaps will fail until you connect GitHub again."
                    confirmLabel="Disconnect"
                    destructive
                  >
                    <Button variant="ghost">Disconnect</Button>
                  </ConfirmAction>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Groq API key</CardTitle>
            <CardDescription>
              Recaps are written by a model on Groq using your own key. It is verified, then stored encrypted.
            </CardDescription>
            <CardAction>
              <Badge variant={groqKey ? "secondary" : "outline"}>{groqKey ? "Saved" : "Not set"}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            {groqKey ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground text-sm">
                  Key ending in <code className="text-foreground">…{groqKey.keyHint}</code>
                </p>
                <ConfirmAction
                  action={removeGroqKeyAction}
                  title="Remove Groq API key?"
                  description="Recaps cannot be generated until you add a key again."
                  confirmLabel="Remove"
                  destructive
                >
                  <Button variant="ghost">Remove</Button>
                </ConfirmAction>
              </div>
            ) : null}
            <GroqKeyForm hasKey={groqKey !== null} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
