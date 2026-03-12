"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { toMonthLabel } from "@/lib/utils";
import type { MemoryEntryRecord, PhotoRecord } from "@/types/models";

export function MemoryEntryCard({
  entry,
  photos,
  photoUrls,
}: {
  entry: MemoryEntryRecord;
  photos: PhotoRecord[];
  photoUrls: Record<string, string>;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-1),var(--pink-soft)_40%)] p-5">
      <p className="text-sm uppercase tracking-[0.14em] text-[var(--text-muted)]">{toMonthLabel(entry.visitedAt)}</p>

      <div className="mt-3">
        {entry.description ? (
          <p className="text-base leading-relaxed text-[var(--text-primary)]">{entry.description}</p>
        ) : (
          <p className="rounded-xl bg-[color-mix(in_oklab,var(--surface-1),var(--gray-ref)_16%)] px-3 py-2 text-base text-[var(--text-secondary)]">
            No description added for this memory.
          </p>
        )}
      </div>

      <div className="mt-4">
        {photos.length === 0 ? (
          <EmptyState
            className="py-6"
            title="No photos"
            description="This memory was saved without photos."
          />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {photos.map((photo) => {
              const url = photoUrls[photo.id];
              return (
                <a
                  key={photo.id}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative block overflow-hidden rounded-xl border border-[var(--border-soft)]"
                >
                  {url ? (
                    <img
                      src={url}
                      alt={photo.fileName}
                      className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="aspect-square bg-[var(--surface-2)]" />
                  )}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}
