"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, CalendarPlus, ImagePlus } from "lucide-react";

import { MemoryEntryCard } from "@/components/place/memory-entry-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/hooks/use-app-store";

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function CityDetail({ cityId }: { cityId: string }) {
  const { getCityById, getEntriesForCity, getPhotosForEntry, photoUrls, addMemoryEntry, deleteMemoryEntry } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const city = getCityById(cityId);
  const entries = getEntriesForCity(cityId);

  const [visitedAt, setVisitedAt] = useState(currentMonthValue());
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPhotos = useMemo(() => {
    return entries.reduce((count, entry) => count + entry.photoIds.length, 0);
  }, [entries]);

  if (!city) {
    return (
      <Card>
        <EmptyState
          className="[&>h3]:!text-[var(--pink-dark)] [&>h3]:font-semibold [&>p]:!text-[var(--pink-dark)] [&>p]:font-medium"
          title="City not found"
          description="This city is not in your scrapbook anymore."
          action={
            <Link href="/places">
              <Button variant="secondary">Back to Places</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="bg-[linear-gradient(152deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_30%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_12%)_100%)]">
        <Link
          href="/places"
          className="inline-flex items-center gap-2 text-[0.98rem] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={14} />
          Back to Places
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="ds-eyebrow">City</p>
            <h1 className="ds-page-title mt-1">{city.cityName}</h1>
            <p className="ds-body mt-2">
              {city.region ? `${city.region}, ` : ""}
              {city.countryName}
            </p>
          </div>

          <div className="rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-1),var(--gray-ref)_18%)] px-4 py-3 text-base text-[var(--text-secondary)]">
            <p>
              {entries.length} memory {entries.length === 1 ? "entry" : "entries"}
            </p>
            <p>
              {totalPhotos} photo{totalPhotos === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </Card>

      <Card className="bg-[linear-gradient(145deg,color-mix(in_oklab,var(--card-strong),var(--gray-ref)_30%)_0%,color-mix(in_oklab,var(--card-strong),var(--pink-bright)_16%)_100%)] text-[var(--text-primary)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[1.02rem] font-semibold text-[var(--text-primary)]">
            <CalendarPlus size={16} />
            Add memory to this city
          </div>
          <Button
            type="button"
            variant={composerOpen ? "secondary" : "primary"}
            size="sm"
            onClick={() => setComposerOpen((current) => !current)}
          >
            {composerOpen ? "Hide Form" : entries.length === 0 ? "Add First Memory" : "Add Memory"}
          </Button>
        </div>

        {composerOpen ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="add-place-month-wrap min-w-0">
                <div className="add-place-month-shell">
                  <Input
                    type="month"
                    value={visitedAt}
                    onChange={(event) => setVisitedAt(event.target.value)}
                    className="add-place-month-input min-w-0 max-w-full max-[430px]:text-[0.9rem]"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                />
                <div className="rounded-[var(--radius-control)] border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-1),var(--gray-ref)_18%)] px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="whitespace-nowrap"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus size={14} />
                      Choose Files
                    </Button>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {files.length === 0
                        ? "No files chosen."
                        : `${files.length} file${files.length === 1 ? "" : "s"} chosen.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-2 text-[0.75rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                <ImagePlus size={14} />
                Description (optional)
              </label>
              <Textarea
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Write about this visit"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                onClick={async () => {
                  setPending(true);
                  setError(null);
                  try {
                    await addMemoryEntry({
                      cityId,
                      visitedAt,
                      description,
                      files,
                    });
                    setDescription("");
                    setFiles([]);
                    setVisitedAt(currentMonthValue());
                    setComposerOpen(false);
                  } catch (submitError) {
                    setError(submitError instanceof Error ? submitError.message : "Could not save memory.");
                  } finally {
                    setPending(false);
                  }
                }}
                disabled={pending || !visitedAt}
              >
                {pending ? "Saving..." : "Save Memory"}
              </Button>
              <p className="text-sm text-[var(--text-secondary)]">
                {files.length} selected photo{files.length === 1 ? "" : "s"}
              </p>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Keep this page focused on your timeline. Open the form only when you want to log a new memory.
          </p>
        )}

        {error ? <p className="mt-3 text-sm text-[var(--text-primary)]">{error}</p> : null}
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="ds-section-title">Memory Timeline</h3>
          <p className="ds-meta">Newest first</p>
        </div>

        {entries.length === 0 ? (
          <Card>
            <EmptyState
              className="[&>h3]:!text-[var(--pink-dark)] [&>h3]:font-semibold [&>p]:!text-[var(--pink-dark)] [&>p]:font-medium"
              title="No memory entries yet"
              description="Add the first memory for this city to start its timeline."
              action={
                <Button type="button" variant="secondary" onClick={() => setComposerOpen(true)}>
                  Add First Memory
                </Button>
              }
            />
          </Card>
        ) : (
          entries.map((entry) => (
            <MemoryEntryCard
              key={entry.id}
              entry={entry}
              photos={getPhotosForEntry(entry.id)}
              photoUrls={photoUrls}
              deleting={deletingEntryId === entry.id}
              onDelete={async () => {
                const confirmed = window.confirm("Delete this memory entry and its photos?");
                if (!confirmed) {
                  return;
                }

                setDeletingEntryId(entry.id);
                setError(null);
                try {
                  await deleteMemoryEntry(entry.id);
                } catch (deleteError) {
                  setError(deleteError instanceof Error ? deleteError.message : "Could not delete memory entry.");
                } finally {
                  setDeletingEntryId(null);
                }
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
