"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, GalleryHorizontal, Map, Plus, Settings } from "lucide-react";

import { WelcomeGate } from "@/components/auth/welcome-gate";
import { AddPlaceModal } from "@/components/place/add-place-modal";
import { UpcomingTripModule } from "@/components/sidebar/upcoming-trip-module";
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
    return "Your world, mapped by memory.";
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,var(--pink-soft)_0%,color-mix(in_oklab,var(--pink-soft),var(--pink-bright)_20%)_46%,color-mix(in_oklab,var(--pink-soft),var(--gray-ref)_22%)_100%)]">
      <div className="mx-auto w-full max-w-[1560px] px-4 pb-36 pt-4 sm:px-6 lg:grid lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[320px_1fr] lg:gap-7 lg:pb-6 lg:pt-6">
        <aside className="hidden self-stretch rounded-[2rem] border border-[var(--border-soft)] bg-[linear-gradient(165deg,color-mix(in_oklab,var(--surface-1),var(--gray-ref)_36%)_0%,color-mix(in_oklab,var(--surface-2),var(--pink-dark)_14%)_100%)] p-6 shadow-[0_34px_60px_-36px_rgba(67,61,78,0.58)] lg:sticky lg:top-6 lg:flex lg:h-[calc(100vh-3rem)] lg:flex-col">
          <div className="rounded-3xl border border-[color-mix(in_oklab,var(--pink-bright),var(--pink-soft)_44%)] bg-[linear-gradient(145deg,var(--pink-soft)_0%,color-mix(in_oklab,var(--pink-soft),var(--pink-bright)_16%)_100%)] px-5 pb-6 pt-5 shadow-[0_18px_34px_-28px_rgba(255,71,162,0.7)]">
            <h1 className="leading-none text-[var(--text-on-light-strong)]">
              <span className="block text-[2.65rem] font-semibold uppercase tracking-[0.04em]">
                BEEN THERE<span className="text-[var(--pink-bright)]">.</span>
              </span>
              <span className="mt-1.5 block text-[1rem] font-semibold uppercase tracking-[0.22em] text-[var(--text-on-light)]">
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
                      ? "border border-[color-mix(in_oklab,var(--pink-bright),var(--pink-soft)_28%)] bg-[linear-gradient(118deg,var(--pink-bright)_0%,color-mix(in_oklab,var(--pink-bright),var(--pink-dark)_34%)_100%)] text-[var(--pink-soft)] shadow-[0_10px_24px_-14px_rgba(255,71,162,0.66)]"
                      : "text-[var(--text-secondary)] hover:bg-[color-mix(in_oklab,var(--surface-3),var(--pink-soft)_14%)] hover:text-[var(--text-primary)]",
                  )}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-7">
            <UpcomingTripModule />
          </div>
        </aside>

        <section className="min-w-0">
          <header className="mb-5 rounded-[1.75rem] border border-[var(--border-soft)] bg-[linear-gradient(140deg,color-mix(in_oklab,var(--surface-1),var(--gray-ref)_40%)_0%,color-mix(in_oklab,var(--surface-2),var(--pink-bright)_16%)_100%)] px-6 py-5 shadow-[0_26px_54px_-34px_rgba(67,61,78,0.58)] sm:px-7 lg:px-8">
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

      <div className="fixed inset-x-0 bottom-0 z-30 px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <nav className="mx-auto grid w-full max-w-md grid-cols-5 gap-1 rounded-2xl border border-[var(--border-soft)] bg-[linear-gradient(148deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_22%)_0%,color-mix(in_oklab,var(--surface-2),var(--pink-bright)_14%)_100%)] p-1.5 shadow-[0_20px_38px_-20px_rgba(67,61,78,0.58)] backdrop-blur">
          {navItems.slice(0, 2).map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[58px] flex-col items-center justify-center rounded-xl px-1 text-[11px] font-semibold",
                  active
                    ? "bg-[linear-gradient(120deg,var(--pink-bright)_0%,color-mix(in_oklab,var(--pink-bright),var(--pink-dark)_32%)_100%)] text-[var(--pink-soft)]"
                    : "text-[var(--text-secondary)]",
                )}
              >
                <Icon size={17} />
                <span className="mt-1">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setAddPlaceOpen(true)}
            className="flex min-h-[58px] flex-col items-center justify-center rounded-xl bg-[linear-gradient(120deg,var(--pink-bright)_0%,color-mix(in_oklab,var(--pink-bright),var(--pink-dark)_30%)_100%)] text-[var(--pink-soft)] shadow-[0_14px_24px_-14px_rgba(255,71,162,0.72)]"
            aria-label="Add place"
          >
            <Plus size={18} />
            <span className="mt-1 text-[11px] font-semibold">Add</span>
          </button>

          {navItems.slice(2).map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[58px] flex-col items-center justify-center rounded-xl px-1 text-[11px] font-semibold",
                  active
                    ? "bg-[linear-gradient(120deg,var(--pink-bright)_0%,color-mix(in_oklab,var(--pink-bright),var(--pink-dark)_32%)_100%)] text-[var(--pink-soft)]"
                    : "text-[var(--text-secondary)]",
                )}
              >
                <Icon size={17} />
                <span className="mt-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <AddPlaceModal open={addPlaceOpen} onOpenChange={setAddPlaceOpen} />

      {!session ? <WelcomeGate onSignIn={signIn} /> : null}
    </div>
  );
}
