"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WelcomeGate({
  onSignIn,
}: {
  onSignIn: (displayName: string) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,var(--pink-soft)_0%,color-mix(in_oklab,var(--pink-soft),var(--pink-bright)_24%)_52%,color-mix(in_oklab,var(--pink-soft),var(--gray-ref)_18%)_100%)] px-5 py-10">
      <div className="w-full max-w-xl rounded-[2.5rem] border border-[var(--border-soft)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_34%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_14%)_100%)] p-8 shadow-[0_36px_78px_-44px_rgba(67,61,78,0.62)] sm:p-10">
        <p className="text-sm uppercase tracking-[0.16em] text-[var(--text-muted)]">Welcome</p>
        <h1 className="mt-3 leading-none text-[var(--text-primary)]">
          <span className="block text-4xl font-semibold uppercase tracking-[0.03em] sm:text-[2.9rem]">
            BEEN THERE<span className="text-[var(--pink-bright)]">.</span>
          </span>
          <span className="mt-2 block text-base font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            DONE THAT.
          </span>
        </h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--text-secondary)] sm:text-[1.04rem]">
          Your personal travel scrapbook for places you have actually visited. This v1 uses a local
          mock session and keeps your data in this browser.
        </p>

        <div className="mt-7 space-y-3">
          <label className="text-base font-semibold text-[var(--text-primary)]">Display name</label>
          <Input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            onClick={async () => {
              setPending(true);
              await onSignIn(displayName);
              setPending(false);
            }}
            disabled={pending}
          >
            {pending ? "Entering..." : "Enter scrapbook"}
          </Button>
          <p className="text-sm text-[var(--text-muted)]">No password required for v1.</p>
        </div>
      </div>
    </div>
  );
}
