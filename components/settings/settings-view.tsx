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
    <div className="space-y-5">
      <Card className="bg-[linear-gradient(150deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_30%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_14%)_100%)]">
        <p className="ds-eyebrow">App</p>
        <h3 className="ds-section-title mt-2">BEEN THERE. DONE THAT.</h3>
        <p className="ds-body mt-2.5 max-w-3xl">
          Your scrapbook lives in this browser for now, with backup/import controls below.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-3),var(--gray-ref)_32%)] p-4">
            <p className="ds-meta">Cities</p>
            <p className="mt-1 text-[1.65rem] font-semibold text-[var(--text-primary)]">{cities.length}</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-3),var(--gray-ref)_32%)] p-4">
            <p className="ds-meta">Memory Entries</p>
            <p className="mt-1 text-[1.65rem] font-semibold text-[var(--text-primary)]">{memoryEntries.length}</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-3),var(--gray-ref)_32%)] p-4">
            <p className="ds-meta">Uploaded Photos</p>
            <p className="mt-1 text-[1.65rem] font-semibold text-[var(--text-primary)]">{photos.length}</p>
          </div>
        </div>
      </Card>

      <Card className="bg-[linear-gradient(150deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_32%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_10%)_100%)]">
        <h3 className="ds-section-title">Backup & Restore</h3>
        <p className="ds-body mt-2">
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

          <Button variant="dark" onClick={() => fileInputRef.current?.click()} disabled={pendingImport}>
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

        {statusMessage ? <p className="mt-3 text-base font-medium text-[var(--text-primary)]">{statusMessage}</p> : null}
      </Card>

      <Card className="bg-[linear-gradient(150deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_32%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_10%)_100%)]">
        <h3 className="ds-section-title">Session</h3>
        <p className="ds-body mt-1.5">
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
