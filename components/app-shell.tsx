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
    return "Where your life has taken you.";
  }

  if (pathname.startsWith("/places")) {
    return "Visited places organized by country and city.";
  }

  if (pathname.startsWith("/gallery")) {
    return "All uploaded photos, searchable.";
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
  const mobileActiveIndex = useMemo(() => {
    const index = navItems.findIndex((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
    return index >= 0 ? index : 0;
  }, [pathname]);
  const mobileIndicatorStyle = useMemo(
    () => ({
      transform: `translateX(${mobileActiveIndex * 100}%)`,
    }),
    [mobileActiveIndex],
  );

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--app-bg)]">
        <div className="rounded-[var(--radius-panel)] border border-[var(--border-soft)] bg-[var(--surface-1)] px-6 py-4 text-base text-[var(--text-secondary)] shadow-[var(--shadow-elevated)]">
          Loading scrapbook...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,var(--pink-soft)_0%,color-mix(in_oklab,var(--pink-soft),var(--pink-bright)_20%)_46%,color-mix(in_oklab,var(--pink-soft),var(--gray-ref)_22%)_100%)]">
      <div className="mx-auto w-full max-w-[1560px] px-3 pb-36 pt-3 sm:px-6 sm:pt-4 lg:grid lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[320px_1fr] lg:gap-7 lg:pb-6 lg:pt-6">
        <aside className="hidden self-stretch rounded-[2rem] border border-[var(--border-soft)] bg-[linear-gradient(165deg,color-mix(in_oklab,var(--surface-1),var(--gray-ref)_36%)_0%,color-mix(in_oklab,var(--surface-2),var(--pink-dark)_14%)_100%)] p-6 shadow-[var(--shadow-panel)] lg:sticky lg:top-6 lg:flex lg:h-[calc(100vh-3rem)] lg:flex-col">
          <div className="rounded-3xl border border-[color-mix(in_oklab,var(--pink-bright),var(--pink-soft)_44%)] bg-[linear-gradient(145deg,var(--pink-soft)_0%,color-mix(in_oklab,var(--pink-soft),var(--pink-bright)_16%)_100%)] px-5 pb-6 pt-5 shadow-[0_18px_34px_-28px_rgba(255,71,162,0.7)]">
            <h1 className="leading-none text-[var(--text-on-light-strong)]">
              <span className="block text-[2.65rem] font-semibold uppercase tracking-[0.03em]">
                BEEN THERE<span className="text-[var(--pink-bright)]">.</span>
              </span>
              <span className="mt-1.5 block text-[1rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-on-light)]">
                DONE THAT.
              </span>
            </h1>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-[var(--radius-card)] px-4 py-2.5 text-[1rem] font-semibold transition",
                    active
                      ? "border border-[color-mix(in_oklab,var(--pink-soft),var(--pink-bright)_52%)] bg-[linear-gradient(135deg,rgba(255,71,162,0.34)_0%,rgba(255,222,240,0.24)_100%)] text-[var(--pink-soft)] shadow-[inset_0_1px_0_rgba(255,222,240,0.44),0_12px_22px_-16px_rgba(255,71,162,0.9)] backdrop-blur-md"
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
          <div className="mb-2.5 rounded-[var(--radius-card)] border border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_20%)] bg-[linear-gradient(145deg,var(--pink-soft)_0%,color-mix(in_oklab,var(--pink-soft),var(--pink-bright)_14%)_100%)] px-3.5 py-2 shadow-[0_10px_22px_-18px_rgba(255,71,162,0.65)] lg:hidden">
            <p className="leading-none text-[var(--text-on-light-strong)]">
              <span className="block text-[0.98rem] font-semibold uppercase tracking-[0.06em]">
                BEEN THERE<span className="text-[var(--pink-bright)]">.</span>
              </span>
              <span className="mt-1 block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-on-light)]">
                DONE THAT.
              </span>
            </p>
          </div>

          <header className="mb-4 rounded-[var(--radius-panel)] border border-[var(--border-soft)] bg-[linear-gradient(140deg,color-mix(in_oklab,var(--surface-1),var(--gray-ref)_40%)_0%,color-mix(in_oklab,var(--surface-2),var(--pink-bright)_16%)_100%)] px-4 py-4 shadow-[var(--shadow-panel)] sm:mb-5 sm:px-7 sm:py-5 lg:px-8">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:gap-4">
              <h2 className="ds-page-title min-w-0 !text-[1.62rem] sm:!text-[clamp(1.8rem,2vw,2.35rem)]">{pageTitle}</h2>

              <Button
                size="sm"
                className="shrink-0 self-start px-2.5 text-[0.78rem] sm:px-3.5 sm:text-[0.92rem]"
                onClick={() => setAddPlaceOpen(true)}
              >
                <Plus size={16} />
                Add Place
              </Button>
            </div>

            <p className="ds-body mt-1 text-[0.8rem] leading-tight sm:mt-1.5 sm:text-[0.9rem] sm:leading-snug lg:text-[var(--font-body)]">
              {pageSubtitle}
            </p>
          </header>

          <div className="space-y-3.5 sm:space-y-4">{children}</div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
        <nav className="relative mx-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-[var(--border-soft)] bg-[linear-gradient(148deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_22%)_0%,color-mix(in_oklab,var(--surface-2),var(--pink-bright)_14%)_100%)] p-1.5 shadow-[var(--shadow-elevated)] backdrop-blur">
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 z-0 w-1/4 rounded-[1.35rem] border border-[color-mix(in_oklab,var(--pink-soft),var(--pink-bright)_54%)] bg-[linear-gradient(135deg,rgba(255,71,162,0.34)_0%,rgba(255,222,240,0.24)_100%)] shadow-[inset_0_1px_0_rgba(255,222,240,0.46),0_12px_22px_-16px_rgba(255,71,162,0.82)] backdrop-blur-md transition-transform duration-500 ease-[cubic-bezier(0.22,0.8,0.22,1)]"
              style={mobileIndicatorStyle}
            />

            <div className="relative z-10 grid grid-cols-4">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-[62px] flex-col items-center justify-center rounded-[1.2rem] px-1 text-[12px] font-semibold leading-none transition-colors duration-300",
                    active ? "text-[var(--pink-soft)]" : "text-[var(--text-secondary)]",
                  )}
                >
                  <Icon size={18} />
                  <span className="mt-1.5">{item.label}</span>
                </Link>
              );
            })}
            </div>
          </div>
        </nav>
      </div>

      <AddPlaceModal open={addPlaceOpen} onOpenChange={setAddPlaceOpen} />

      {!session ? <WelcomeGate onSignIn={signIn} /> : null}
    </div>
  );
}
