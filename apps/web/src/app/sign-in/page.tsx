import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { safeNextPath } from "@/lib/safe-redirect";
import { getSession } from "@/server/session";
import { SignInButtons } from "./sign-in-buttons";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  const callbackURL = safeNextPath(typeof next === "string" ? next : undefined);

  if (await getSession()) redirect(callbackURL);

  return (
    <main className="bg-muted/40 flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <Logo />
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign in</CardTitle>
          <CardDescription>Use the account you work with every day.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInButtons callbackURL={callbackURL} />
        </CardContent>
      </Card>
      <p className="text-muted-foreground max-w-sm text-center text-xs">
        Signing in only shares your name and email. Access to your repositories and mailboxes is requested separately,
        when you connect them. By signing in, you agree to the <Link href="/terms" className="underline underline-offset-4">Terms of Service</Link>{" "}
        and the <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>.
      </p>
    </main>
  );
}
