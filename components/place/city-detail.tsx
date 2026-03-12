"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  const { getCityById, getEntriesForCity, getPhotosForEntry, photoUrls, addMemoryEntry } = useAppStore();

  const city = getCityById(cityId);
  const entries = getEntriesForCity(cityId);

  const [visitedAt, setVisitedAt] = useState(currentMonthValue());
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPhotos = useMemo(() => {
    return entries.reduce((count, entry) => count + entry.photoIds.length, 0);
  }, [entries]);

  if (!city) {
    return (
      <Card>
        <EmptyState
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
      <Card className="bg-[color-mix(in_oklab,var(--surface-2),var(--gray-ref)_24%)]">
        <Link
          href="/places"
          className="inline-flex items-center gap-2 text-base font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={14} />
          Back to Places
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-[var(--text-muted)]">City</p>
            <h1 className="mt-1 text-[2.15rem] font-semibold tracking-tight text-[var(--text-primary)]">{city.cityName}</h1>
            <p className="mt-2 text-base text-[var(--text-secondary)]">
              {city.region ? `${city.region}, ` : ""}
              {city.countryName}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-1),var(--gray-ref)_18%)] px-4 py-3 text-base text-[var(--text-secondary)]">
            <p>
              {entries.length} memory {entries.length === 1 ? "entry" : "entries"}
            </p>
            <p>
              {totalPhotos} photo{totalPhotos === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </Card>

      <Card className="bg-[linear-gradient(145deg,color-mix(in_oklab,var(--card-strong),var(--gray-ref)_28%)_0%,color-mix(in_oklab,var(--card-strong),var(--pink-soft)_18%)_100%)] text-[var(--text-primary)]">
        <div className="mb-4 flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
          <CalendarPlus size={16} />
          Add another memory entry
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            type="month"
            value={visitedAt}
            onChange={(event) => setVisitedAt(event.target.value)}
          />
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            className="file:mr-2 file:rounded-md file:border-0 file:bg-[var(--surface-1)] file:px-2.5 file:py-1.5 file:text-sm file:font-medium file:text-[var(--text-primary)]"
          />
        </div>

        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 text-sm uppercase tracking-[0.12em] text-[var(--text-secondary)]">
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

        {error ? <p className="mt-3 text-sm text-[#ffd3e2]">{error}</p> : null}
      </Card>

      <div className="space-y-3">
        {entries.length === 0 ? (
          <Card>
            <EmptyState
              title="No memory entries yet"
              description="Add the first memory for this city to start its timeline."
            />
          </Card>
        ) : (
          entries.map((entry) => (
            <MemoryEntryCard
              key={entry.id}
              entry={entry}
              photos={getPhotosForEntry(entry.id)}
              photoUrls={photoUrls}
            />
          ))
        )}
      </div>
    </div>
  );
}
