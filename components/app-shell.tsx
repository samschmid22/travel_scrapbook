"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, GalleryHorizontal, Map, Plus, RefreshCcw, Settings, Sparkles } from "lucide-react";

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#4c3d52_0%,#403647_40%,#352f3b_100%)]">
      <div className="mx-auto w-full max-w-[1500px] px-4 pb-28 pt-4 sm:px-6 lg:grid lg:grid-cols-[250px_1fr] lg:gap-6 lg:pb-6 lg:pt-6">
        <aside className="hidden rounded-[2rem] border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-1),var(--accent-100)_18%)] p-5 shadow-[0_34px_70px_-42px_rgba(10,7,15,0.8)] lg:flex lg:flex-col">
          <div className="rounded-3xl border border-[color-mix(in_oklab,var(--border-soft),var(--accent-300)_34%)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--surface-2),var(--accent-200)_20%)_0%,color-mix(in_oklab,var(--surface-1),var(--accent-100)_18%)_100%)] px-4 pb-5 pt-4">
            <p className="text-[0.6rem] font-medium uppercase tracking-[0.34em] text-[var(--accent-800)]">Wordmark</p>
            <h1 className="mt-2 leading-none text-[var(--text-primary)]">
              <span className="block text-[2.4rem] font-semibold tracking-[-0.04em]">
                Been There<span className="text-[var(--accent-700)]">.</span>
              </span>
              <span className="mt-1.5 block text-[0.82rem] font-semibold uppercase tracking-[0.19em] text-[var(--text-secondary)]">
                Done That.
              </span>
            </h1>
            <p className="mt-3 text-xs text-[var(--text-muted)]">Personal travel scrapbook</p>
          </div>

          <nav className="mt-5 space-y-1">
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
                      ? "bg-[color-mix(in_oklab,var(--accent-200),white_7%)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[color-mix(in_oklab,var(--surface-2),var(--accent-100)_20%)]",
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-3xl border border-[color-mix(in_oklab,var(--border-soft),var(--accent-300)_35%)] bg-[linear-gradient(165deg,color-mix(in_oklab,var(--surface-2),var(--accent-200)_22%)_0%,color-mix(in_oklab,var(--surface-1),var(--accent-100)_8%)_100%)] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--accent-800)]">
                <Sparkles size={12} />
                World Spark
              </p>
              <button
                type="button"
                onClick={() => setSparkIndex((current) => (current + 1) % worldSparks.length)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-3)] text-[var(--text-secondary)] transition hover:border-[var(--accent-300)] hover:text-[var(--text-primary)]"
                aria-label="Refresh world spark"
              >
                <RefreshCcw size={13} />
              </button>
            </div>
            <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">{spark.title}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--accent-400)]">{spark.subtitle}</p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">{spark.line}</p>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="mb-5 rounded-[1.75rem] border border-[var(--border-soft)] bg-[linear-gradient(140deg,color-mix(in_oklab,var(--surface-1),var(--accent-200)_12%)_0%,color-mix(in_oklab,var(--surface-1),var(--accent-100)_6%)_100%)] px-5 py-4 shadow-[0_24px_48px_-34px_rgba(8,5,12,0.7)] sm:px-6 lg:px-7">
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
                  active
                    ? "bg-[color-mix(in_oklab,var(--accent-200),white_8%)] text-[var(--text-primary)]"
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
