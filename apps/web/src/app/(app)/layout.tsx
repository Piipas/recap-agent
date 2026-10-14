import { AppNav } from "@/components/app-nav";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { requireUser } from "@/server/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Logo href="/recaps" />
          <div className="hidden flex-1 md:block">
            <AppNav />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu name={user.name} email={user.email} image={user.image} />
          </div>
        </div>
        <div className="border-t px-4 py-2 md:hidden">
          <AppNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
