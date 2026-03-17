"use client";

import { Trash2 } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { toMonthLabel } from "@/lib/utils";
import type { MemoryEntryRecord, PhotoRecord } from "@/types/models";

export function MemoryEntryCard({
  entry,
  photos,
  photoUrls,
  onDelete,
  deleting = false,
}: {
  entry: MemoryEntryRecord;
  photos: PhotoRecord[];
  photoUrls: Record<string, string>;
  onDelete?: () => Promise<void>;
  deleting?: boolean;
}) {
  return (
    <article className="rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-3),var(--gray-ref)_30%)] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="ds-eyebrow">{toMonthLabel(entry.visitedAt)}</p>
        {onDelete ? (
          <Button
            type="button"
            variant="danger"
            size="sm"
            className="h-8 px-2.5 text-[0.72rem] sm:h-9 sm:text-[0.8rem]"
            onClick={() => void onDelete()}
            disabled={deleting}
          >
            <Trash2 size={14} />
            {deleting ? "Deleting..." : "Delete Entry"}
          </Button>
        ) : null}
      </div>

      <div className="mt-3">
        {entry.description ? (
          <p className="text-base leading-relaxed text-[var(--text-primary)]">{entry.description}</p>
        ) : (
          <p className="rounded-[var(--radius-control)] bg-[color-mix(in_oklab,var(--surface-1),var(--gray-ref)_16%)] px-3 py-2 text-base text-[var(--text-secondary)]">
            No description added for this memory.
          </p>
        )}
      </div>

      <div className="mt-4">
        {photos.length === 0 ? (
          <EmptyState
            className="py-6 [&>h3]:!text-[var(--pink-dark)] [&>h3]:font-semibold [&>p]:!text-[var(--pink-dark)] [&>p]:font-medium"
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
                  className="group relative block overflow-hidden rounded-[var(--radius-control)] border border-[var(--border-soft)]"
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
