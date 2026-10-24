"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, Plus, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/locataires", label: "Locataires", icon: Users },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || (pathname.startsWith(href + "/") && !pathname.startsWith("/documents/nouveau"));
}

function SideNav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
            isActive(pathname, href) && "bg-primary/10 font-medium text-primary hover:bg-primary/10 hover:text-primary",
          )}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      {NAV.slice(0, 2).map((item) => (
        <MobileNavItem key={item.href} {...item} active={isActive(pathname, item.href)} />
      ))}
      <Link href="/documents/nouveau" className="flex items-center justify-center" aria-label="Nouveau document">
        <span className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
          <Plus className="size-6" />
        </span>
      </Link>
      {NAV.slice(2).map((item) => (
        <MobileNavItem key={item.href} {...item} active={isActive(pathname, item.href)} />
      ))}
    </nav>
  );
}

function ActiveSideNav() {
  return <SideNav pathname={usePathname()} />;
}

function ActiveBottomNav() {
  return <BottomNav pathname={usePathname()} />;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-background p-4 md:flex">
        <Link href="/" className="mb-8 flex items-center gap-2 px-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Home className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-semibold">Mes Loyers</span>
            <span className="block text-xs text-muted-foreground">Factures & reçus</span>
          </span>
        </Link>
        <Link
          href="/documents/nouveau"
          className="mb-4 flex h-10 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Plus className="size-4" /> Nouveau document
        </Link>
        <Suspense fallback={<SideNav pathname="" />}>
          <ActiveSideNav />
        </Suspense>
        <p className="mt-auto px-2 text-xs text-muted-foreground">
          Vos données restent enregistrées sur cet appareil.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Home className="size-4" />
            </span>
            Mes Loyers
          </Link>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 md:px-8 md:py-8">{children}</main>
      </div>

      <Suspense fallback={<BottomNav pathname="" />}>
        <ActiveBottomNav />
      </Suspense>
    </div>
  );
}

function MobileNavItem({
  href,
  label,
  icon: Icon,
  active,
}: (typeof NAV)[number] & { active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground",
        active && "font-medium text-primary",
      )}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}
