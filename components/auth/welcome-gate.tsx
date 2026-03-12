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
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#5b4a63_0%,#443a4c_45%,#342f3b_100%)] px-5 py-10">
      <div className="w-full max-w-xl rounded-[2.5rem] border border-[var(--border-soft)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--surface-1),var(--accent-200)_18%)_0%,color-mix(in_oklab,var(--surface-1),var(--accent-100)_8%)_100%)] p-8 shadow-[0_40px_90px_-50px_rgba(0,0,0,0.82)] sm:p-10">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--text-muted)]">Welcome</p>
        <h1 className="mt-3 leading-none text-[var(--text-primary)]">
          <span className="block text-4xl font-semibold tracking-[-0.038em] sm:text-[2.85rem]">
            Been There<span className="text-[var(--accent-700)]">.</span>
          </span>
          <span className="mt-2 block text-sm font-semibold uppercase tracking-[0.19em] text-[var(--text-secondary)]">
            Done That.
          </span>
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
