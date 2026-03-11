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
    <div className="space-y-4">
      <Card>
        <Link
          href="/places"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={14} />
          Back to Places
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">City</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{city.cityName}</h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {city.region ? `${city.region}, ` : ""}
              {city.countryName}
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            <p>
              {entries.length} memory {entries.length === 1 ? "entry" : "entries"}
            </p>
            <p>
              {totalPhotos} photo{totalPhotos === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </Card>

      <Card className="bg-[var(--card-strong)] text-white">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white/95">
          <CalendarPlus size={16} />
          Add another memory entry
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            type="month"
            value={visitedAt}
            onChange={(event) => setVisitedAt(event.target.value)}
            className="border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/20"
          />
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
            className="border-white/20 bg-white/10 text-white file:mr-2 file:rounded-md file:border-0 file:bg-white/20 file:px-2 file:py-1 file:text-xs file:text-white"
          />
        </div>

        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-white/80">
            <ImagePlus size={14} />
            Description (optional)
          </label>
          <Textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:border-white/40 focus:ring-white/20"
            placeholder="Write about this visit"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            className="bg-[var(--accent-700)] text-[#1f1822] hover:bg-[var(--accent-800)]"
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
          <p className="text-xs text-white/80">
            {files.length} selected photo{files.length === 1 ? "" : "s"}
          </p>
        </div>

        {error ? <p className="mt-3 text-sm text-[#ffd7e4]">{error}</p> : null}
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
