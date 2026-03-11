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
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#f2dce4_0%,#f8e8ee_50%,#f6e7ec_100%)] px-5 py-10">
      <div className="w-full max-w-xl rounded-[2.5rem] border border-[var(--border-soft)] bg-[var(--surface-1)] p-8 shadow-[0_30px_80px_-44px_rgba(40,22,31,0.55)] sm:p-10">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-muted)]">Welcome</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
          Been There.
          <br />
          Done That.
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
          Your personal travel scrapbook for places you have actually visited. This v1 uses a local
          mock session and keeps your data in this browser.
        </p>

        <div className="mt-7 space-y-3">
          <label className="text-sm font-medium text-[var(--text-primary)]">Display name</label>
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
          <p className="text-xs text-[var(--text-muted)]">No password required for v1.</p>
        </div>
      </div>
    </div>
  );
}
