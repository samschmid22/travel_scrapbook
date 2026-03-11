"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppStore } from "@/hooks/use-app-store";

function currentDateLabel() {
  return new Date().toISOString().slice(0, 10);
}

export function SettingsView() {
  const { cities, memoryEntries, photos, session, signOut, exportBackupJson, importBackupFile } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingExport, setPendingExport] = useState(false);
  const [pendingImport, setPendingImport] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">App</p>
        <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Been There. Done That.</h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)]">
          Version 1 keeps all data in IndexedDB on this browser/device. Cloud sync and real auth can be
          added later with a Supabase adapter without rewriting page components.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-[var(--surface-2)] p-4">
            <p className="text-xs text-[var(--text-muted)]">Cities</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{cities.length}</p>
          </div>
          <div className="rounded-2xl bg-[var(--surface-2)] p-4">
            <p className="text-xs text-[var(--text-muted)]">Memory Entries</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{memoryEntries.length}</p>
          </div>
          <div className="rounded-2xl bg-[var(--surface-2)] p-4">
            <p className="text-xs text-[var(--text-muted)]">Uploaded Photos</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{photos.length}</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Backup & Restore</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Export your scrapbook as JSON for safekeeping. Import replaces current local data with the file
          contents.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="dark"
            onClick={async () => {
              setPendingExport(true);
              setStatusMessage(null);
              try {
                const json = await exportBackupJson();
                const blob = new Blob([json], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `been-there-backup-${currentDateLabel()}.json`;
                document.body.append(anchor);
                anchor.click();
                anchor.remove();
                URL.revokeObjectURL(url);
                setStatusMessage("Backup exported.");
              } catch (error) {
                setStatusMessage(error instanceof Error ? error.message : "Export failed.");
              } finally {
                setPendingExport(false);
              }
            }}
            disabled={pendingExport}
          >
            {pendingExport ? "Exporting..." : "Export Data"}
          </Button>

          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={pendingImport}
          >
            {pendingImport ? "Importing..." : "Import Data"}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }

              setPendingImport(true);
              setStatusMessage(null);

              try {
                await importBackupFile(file);
                setStatusMessage("Backup imported. Local data has been replaced.");
              } catch (error) {
                setStatusMessage(error instanceof Error ? error.message : "Import failed.");
              } finally {
                setPendingImport(false);
                event.currentTarget.value = "";
              }
            }}
          />
        </div>

        {statusMessage ? <p className="mt-3 text-sm text-[var(--text-primary)]">{statusMessage}</p> : null}
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Session</h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Signed in as <span className="font-medium text-[var(--text-primary)]">{session?.displayName ?? "Guest"}</span>
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="danger"
            onClick={async () => {
              await signOut();
              setStatusMessage("Session cleared. Use the welcome gate to sign in again.");
            }}
          >
            Sign Out / Clear Local Session
          </Button>
        </div>
      </Card>
    </div>
  );
}
