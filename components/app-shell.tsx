"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, GalleryHorizontal, Map, Plus, Settings } from "lucide-react";

import { WelcomeGate } from "@/components/auth/welcome-gate";
import { AddPlaceModal } from "@/components/place/add-place-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/hooks/use-app-store";
import { useMemo, useState } from "react";

const navItems = [
  { href: "/map", label: "Map", icon: Map },
  { href: "/places", label: "Places", icon: Compass },
  { href: "/gallery", label: "Gallery", icon: GalleryHorizontal },
  { href: "/settings", label: "Settings", icon: Settings },
];

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/places/")) {
    return "City Detail";
  }

  const match = navItems.find((item) => pathname.startsWith(item.href));
  return match?.label ?? "Been There.";
}

function getPageSubtitle(pathname: string) {
  if (pathname.startsWith("/map")) {
    return "Track where you have been and what still calls you.";
  }

  if (pathname.startsWith("/places")) {
    return "Organize memories by country and city.";
  }

  if (pathname.startsWith("/gallery")) {
    return "All uploaded photos in one calm, searchable view.";
  }

  if (pathname.startsWith("/settings")) {
    return "Local storage, backups, and session controls.";
  }

  return "Personal travel scrapbook";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, session, signIn } = useAppStore();
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);

  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname]);
  const pageSubtitle = useMemo(() => getPageSubtitle(pathname), [pathname]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--app-bg)]">
        <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-1)] px-6 py-4 text-sm text-[var(--text-secondary)] shadow-lg">
          Loading scrapbook...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#2b2832_0%,#1f1d25_36%,#17161c_100%)]">
      <div className="mx-auto w-full max-w-[1500px] px-4 pb-28 pt-4 sm:px-6 lg:grid lg:grid-cols-[250px_1fr] lg:gap-6 lg:pb-6 lg:pt-6">
        <aside className="hidden rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface-1)] p-5 shadow-[0_28px_64px_-40px_rgba(2,2,5,0.85)] lg:block">
          <div className="px-2 pb-6 pt-1">
            <h1 className="text-[2.15rem] font-semibold tracking-tight text-[var(--text-primary)]">Been There.</h1>
            <p className="mt-1 text-sm font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">Done That.</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-[var(--accent-100)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)]",
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-3xl bg-[var(--card-strong)] p-4 text-[var(--text-primary)] shadow-[inset_0_0_0_1px_rgba(116,108,128,0.25)]">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Personal</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              Your scrapbook data is private to this browser in v1.
            </p>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="mb-5 rounded-[1.75rem] border border-[var(--border-soft)] bg-[var(--surface-1)] px-5 py-4 shadow-[0_20px_44px_-32px_rgba(4,3,8,0.8)] sm:px-6 lg:px-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{pageTitle}</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{pageSubtitle}</p>
              </div>

              <Button className="hidden sm:inline-flex" onClick={() => setAddPlaceOpen(true)}>
                <Plus size={16} />
                Add Place
              </Button>
            </div>
          </header>

          <div className="space-y-4">{children}</div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border-soft)] bg-[var(--surface-1)]/94 px-2 py-2 backdrop-blur lg:hidden">
        <nav className="mx-auto grid max-w-xl grid-cols-4 gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center rounded-xl px-2 py-1.5 text-[11px] font-medium",
                  active ? "bg-[var(--accent-100)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]",
                )}
              >
                <Icon size={16} />
                <span className="mt-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <Button
        className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full p-0 shadow-xl sm:hidden"
        onClick={() => setAddPlaceOpen(true)}
        aria-label="Add place"
      >
        <Plus size={18} />
      </Button>

      <AddPlaceModal open={addPlaceOpen} onOpenChange={setAddPlaceOpen} />

      {!session ? <WelcomeGate onSignIn={signIn} /> : null}
    </div>
  );
}
