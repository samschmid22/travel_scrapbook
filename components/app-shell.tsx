"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, GalleryHorizontal, Map, Plus, RefreshCcw, Settings } from "lucide-react";

import { WelcomeGate } from "@/components/auth/welcome-gate";
import { AddPlaceModal } from "@/components/place/add-place-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/hooks/use-app-store";
import { worldSparks } from "@/data/world-sparks";
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
  const [sparkIndex, setSparkIndex] = useState(() => {
    const daySeed = Math.floor(Date.now() / 86_400_000);
    return daySeed % worldSparks.length;
  });

  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname]);
  const pageSubtitle = useMemo(() => getPageSubtitle(pathname), [pathname]);
  const spark = worldSparks[sparkIndex % worldSparks.length];

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffdef0_0%,#f9dfee_36%,#f3d4e6_100%)]">
      <div className="mx-auto w-full max-w-[1560px] px-4 pb-28 pt-4 sm:px-6 lg:grid lg:grid-cols-[300px_1fr] lg:gap-7 lg:pb-6 lg:pt-6">
        <aside className="hidden rounded-[2rem] border border-[var(--border-soft)] bg-[linear-gradient(155deg,color-mix(in_oklab,var(--surface-1),var(--gray-ref)_28%)_0%,color-mix(in_oklab,var(--surface-1),var(--pink-soft)_20%)_100%)] p-6 shadow-[0_26px_48px_-32px_rgba(109,99,109,0.4)] lg:flex lg:flex-col">
          <div className="rounded-3xl border border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_28%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--surface-3),var(--gray-ref)_24%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-soft)_14%)_100%)] px-5 pb-6 pt-5">
            <h1 className="leading-none text-[var(--text-primary)]">
              <span className="block text-[2.55rem] font-semibold uppercase tracking-[0.03em]">
                BEEN THERE<span className="text-[var(--pink-bright)]">.</span>
              </span>
              <span className="mt-1.5 block text-[0.98rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                DONE THAT.
              </span>
            </h1>
          </div>

          <nav className="mt-6 space-y-1.5">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-base font-semibold transition",
                    active
                      ? "border border-[color-mix(in_oklab,var(--pink-bright),var(--gray-ref)_30%)] bg-[color-mix(in_oklab,var(--surface-3),var(--pink-bright)_20%)] text-[var(--text-primary)] shadow-[0_10px_24px_-16px_rgba(255,71,162,0.48)]"
                      : "text-[var(--text-secondary)] hover:bg-[color-mix(in_oklab,var(--surface-3),var(--pink-soft)_20%)]",
                  )}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-7 rounded-3xl border border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_26%)] bg-[linear-gradient(165deg,color-mix(in_oklab,var(--surface-3),var(--gray-ref)_30%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-soft)_16%)_100%)] p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--accent-800)]">
                NEXT ESCAPE
              </p>
              <button
                type="button"
                onClick={() => setSparkIndex((current) => (current + 1) % worldSparks.length)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-3),var(--gray-ref)_30%)] text-[var(--text-secondary)] transition hover:border-[var(--pink-bright)] hover:text-[var(--text-primary)]"
                aria-label="Refresh inspiration"
              >
                <RefreshCcw size={14} />
              </button>
            </div>
            <p className="mt-3 text-xl font-semibold tracking-tight text-[var(--text-primary)]">{spark.title}</p>
            <p className="mt-1 text-sm font-medium uppercase tracking-[0.11em] text-[var(--accent-800)]">{spark.subtitle}</p>
            <p className="mt-3 text-[0.96rem] leading-relaxed text-[var(--text-secondary)]">{spark.line}</p>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="mb-5 rounded-[1.75rem] border border-[var(--border-soft)] bg-[linear-gradient(140deg,color-mix(in_oklab,var(--surface-1),var(--gray-ref)_34%)_0%,color-mix(in_oklab,var(--surface-1),var(--pink-soft)_20%)_100%)] px-6 py-5 shadow-[0_24px_48px_-34px_rgba(119,109,119,0.48)] sm:px-7 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-[2rem] font-semibold tracking-tight text-[var(--text-primary)]">{pageTitle}</h2>
                <p className="mt-1.5 text-base text-[var(--text-secondary)]">{pageSubtitle}</p>
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

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-2),var(--pink-soft)_18%)]/96 px-2 py-2 backdrop-blur lg:hidden">
        <nav className="mx-auto grid max-w-xl grid-cols-4 gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center rounded-xl px-2 py-2 text-xs font-semibold",
                  active
                    ? "bg-[color-mix(in_oklab,var(--surface-3),var(--pink-bright)_20%)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)]",
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
