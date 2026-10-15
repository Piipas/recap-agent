import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm sm:flex-row">
        <span>Recap Agent</span>
        <nav className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <span>CLI is MIT licensed</span>
        </nav>
      </div>
    </footer>
  );
}
