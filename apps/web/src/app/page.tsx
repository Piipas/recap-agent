import { languageCodes } from "@recap/core/languages";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  GitCommitHorizontal,
  Languages,
  Layers,
  MailCheck,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Layers,
    title: "Grouped by outcome",
    description:
      "Related commits are grouped into themes and described by what changed, not by which file was touched. Merges, version bumps and lockfile churn are left out.",
  },
  {
    icon: Building2,
    title: "Personal and organization repos",
    description: "Cover the repositories you own, the organizations you belong to, or both in one recap.",
  },
  {
    icon: CalendarDays,
    title: "Any day, not just today",
    description: "Generate a recap for a past date when you missed an update or need to catch up.",
  },
  {
    icon: Languages,
    title: `${languageCodes.length} languages`,
    description:
      "Write the recap in your manager's language. Code identifiers, repo names and technical terms stay as they are.",
  },
  {
    icon: MailCheck,
    title: "Sent from your own mailbox",
    description:
      "Connect Gmail or Outlook and recaps go out from your address, directly through Google or Microsoft.",
  },
  {
    icon: ShieldCheck,
    title: "Nothing leaves without your approval",
    description:
      "Every recap waits as a draft until you preview and confirm it. Automatic sending is an explicit, per-schedule opt-in.",
  },
] as const;

const steps = [
  {
    icon: GitCommitHorizontal,
    title: "Connect your sources",
    description: "Authorize GitHub so commits can be read, and add your Groq API key for the summary.",
  },
  {
    icon: CalendarClock,
    title: "Generate or schedule",
    description: "Create a recap on demand, or pick the days, time and timezone it should be prepared.",
  },
  {
    icon: CheckCircle2,
    title: "Review the draft",
    description: "Read the recap, choose the mailbox and the managers who receive it, and confirm.",
  },
  {
    icon: MailCheck,
    title: "Send it",
    description: "The recap is sent from your connected mailbox and every attempt is logged.",
  },
] as const;

function ExampleRecap() {
  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardHeader className="border-b">
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>To: engineering-manager@company.com</span>
          <Badge variant="secondary">Awaiting your confirmation</Badge>
        </div>
        <CardTitle className="pt-2 text-lg">Daily Report: 2026-10-12</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-relaxed">
        <div>
          <p className="font-semibold">Summary</p>
          <p className="text-muted-foreground">
            Implemented the billing API refresh and improved test coverage for the onboarding flow. Most of the work
            focused on stabilizing the latest release candidate.
          </p>
        </div>
        <div>
          <p className="font-semibold">Done</p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5">
            <li>Added a safer invoice status sync and cleaned up error handling in the billing workflow.</li>
            <li>Improved onboarding validation and expanded regression tests for account setup.</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">Notes</p>
          <ul className="text-muted-foreground list-disc pl-5">
            <li>One larger refactor touched the payment integration and should be watched during deployment.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="text-muted-foreground hidden items-center gap-6 text-sm md:flex">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#cli" className="hover:text-foreground transition-colors">
              CLI
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="from-primary/10 pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-gradient-to-b to-transparent"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:py-28 lg:grid-cols-2">
            <div className="space-y-6">
              <Badge variant="outline" className="gap-1.5">
                <GitCommitHorizontal className="size-3.5" /> From commits to status update
              </Badge>
              <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                Your day&apos;s commits, turned into a recap your manager can read in a minute.
              </h1>
              <p className="text-muted-foreground max-w-xl text-lg text-pretty">
                Recap Agent reads your GitHub activity for the day, writes a concise, leadership-friendly summary, and
                sends it from your own mailbox, but only after you approve it.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/sign-in">
                    Get started <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </div>
              <p className="text-muted-foreground text-sm">Sign in with GitHub, Google or Microsoft.</p>
            </div>
            <div className="flex justify-center lg:justify-end">
              <ExampleRecap />
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-16 border-t">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">Built for the end-of-day update</h2>
              <p className="text-muted-foreground mt-3">
                Short, factual and written from what the commits actually show. No invented context, no filler.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <Card key={title}>
                  <CardHeader>
                    <span className="bg-primary/10 text-primary mb-2 grid size-9 place-items-center rounded-md">
                      <Icon className="size-5" />
                    </span>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-muted/40 scroll-mt-16 border-t">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
              <p className="text-muted-foreground mt-3">Four steps, and you stay in control of the last one.</p>
            </div>
            <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {steps.map(({ icon: Icon, title, description }, index) => (
                <li key={title} className="bg-background relative rounded-xl border p-6">
                  <span className="text-muted-foreground text-sm font-medium">Step {index + 1}</span>
                  <Icon className="text-primary mt-3 size-6" />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="cli" className="scroll-mt-16 border-t">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight">Prefer the terminal?</h2>
              <p className="text-muted-foreground">
                The same recap generator ships as an open-source CLI. Run it with npx, authenticate with GitHub&apos;s
                device flow, and print the recap straight to your terminal.
              </p>
            </div>
            <div className="bg-card overflow-x-auto rounded-xl border p-5 font-mono text-sm shadow-sm">
              <div className="text-muted-foreground mb-3 flex items-center gap-2 text-xs">
                <Terminal className="size-4" /> terminal
              </div>
              <code className="whitespace-pre">
                {"npx recap-agent \\\n  --repo-type \"user,org\" \\\n  --language fr \\\n  --day 2026-10-13 \\\n  --groq-api-key $GROQ_API_KEY"}
              </code>
            </div>
          </div>
        </section>

        <section className="border-t">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance">
              Spend the last minutes of your day on code, not on the status update.
            </h2>
            <Button asChild size="lg">
              <Link href="/sign-in">
                Sign in to get started <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm sm:flex-row">
          <span>Recap Agent</span>
          <span>MIT licensed</span>
        </div>
      </footer>
    </div>
  );
}
