"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { GitHubIcon, GoogleIcon, MicrosoftIcon } from "@/components/icons/providers";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

const providers = [
  { id: "github", label: "Continue with GitHub", Icon: GitHubIcon },
  { id: "google", label: "Continue with Google", Icon: GoogleIcon },
  { id: "microsoft", label: "Continue with Microsoft", Icon: MicrosoftIcon },
] as const;

export function SignInButtons({ callbackURL }: { callbackURL: string }) {
  const [pending, setPending] = useState<string | null>(null);

  const signIn = async (provider: (typeof providers)[number]["id"]) => {
    setPending(provider);
    const { error } = await authClient.signIn.social({ provider, callbackURL, errorCallbackURL: "/sign-in" });
    if (error) {
      toast.error(error.message ?? "Sign-in failed. Please try again.");
      setPending(null);
    }
  };

  return (
    <div className="grid gap-3">
      {providers.map(({ id, label, Icon }) => (
        <Button key={id} variant="outline" size="lg" disabled={pending !== null} onClick={() => signIn(id)}>
          {pending === id ? <Loader2 className="animate-spin" /> : <Icon className="size-4" />}
          {label}
        </Button>
      ))}
    </div>
  );
}
