"use client";

import { CalendarDays, MapPin, Pencil, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { useAppStore } from "@/hooks/use-app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function formatDate(dateValue?: string) {
  if (!dateValue) {
    return "Date TBD";
  }

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.valueOf())) {
    return "Date TBD";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCountdownLabel(dateValue?: string) {
  if (!dateValue) {
    return "No departure date";
  }

  const target = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(target.valueOf())) {
    return "No departure date";
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = target.getTime() - today.getTime();
  const days = Math.ceil(diffMs / 86_400_000);

  if (days < 0) {
    return "Date has passed";
  }
  if (days === 0) {
    return "Today";
  }
  if (days === 1) {
    return "1 day to go";
  }

  return `${days} days to go`;
}

export function UpcomingTripModule() {
  const { upcomingTrip, saveUpcomingTrip, clearUpcomingTrip } = useAppStore();

  const [editing, setEditing] = useState(false);
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countdownLabel = useMemo(() => getCountdownLabel(upcomingTrip?.departureDate), [upcomingTrip?.departureDate]);

  function beginEditing() {
    setDestination(upcomingTrip?.destination ?? "");
    setDepartureDate(upcomingTrip?.departureDate ?? "");
    setNote(upcomingTrip?.note ?? "");
    setError(null);
    setEditing(true);
  }

  return (
    <div className="rounded-3xl border border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_36%)] bg-[linear-gradient(165deg,color-mix(in_oklab,var(--surface-3),var(--gray-ref)_28%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_16%)_100%)] p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="ds-eyebrow text-[var(--pink-soft)]">
          Next Escape
        </p>
        {!editing ? (
          <button
            type="button"
            onClick={beginEditing}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_30%)] bg-[color-mix(in_oklab,var(--surface-2),var(--pink-soft)_14%)] text-[var(--text-secondary)] transition hover:border-[var(--pink-bright)] hover:bg-[color-mix(in_oklab,var(--surface-2),var(--pink-bright)_22%)] hover:text-[var(--text-primary)]"
            aria-label={upcomingTrip ? "Edit upcoming trip" : "Add upcoming trip"}
          >
            {upcomingTrip ? <Pencil size={14} /> : <Plus size={14} />}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_30%)] bg-[color-mix(in_oklab,var(--surface-2),var(--pink-soft)_14%)] text-[var(--text-secondary)] transition hover:border-[var(--pink-bright)] hover:bg-[color-mix(in_oklab,var(--surface-2),var(--pink-bright)_22%)] hover:text-[var(--text-primary)]"
            aria-label="Close editor"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2.5">
          <Input
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="Destination"
          />
          <Input
            type="date"
            value={departureDate}
            onChange={(event) => setDepartureDate(event.target.value)}
          />
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Optional note (hotel booked, wishlist, packing soon...)"
          />

          {error ? <p className="text-sm text-[var(--text-primary)]">{error}</p> : null}

          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={async () => {
                setPending(true);
                setError(null);
                try {
                  await saveUpcomingTrip({
                    destination,
                    departureDate,
                    note,
                  });
                  setEditing(false);
                } catch (saveError) {
                  setError(saveError instanceof Error ? saveError.message : "Could not save trip.");
                } finally {
                  setPending(false);
                }
              }}
              disabled={pending || destination.trim().length === 0}
            >
              {pending ? "Saving..." : "Save Trip"}
            </Button>
            {upcomingTrip ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  setPending(true);
                  setError(null);
                  await clearUpcomingTrip();
                  setEditing(false);
                  setPending(false);
                }}
                disabled={pending}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      ) : upcomingTrip ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <MapPin size={14} />
            <p className="text-base font-semibold text-[var(--text-primary)]">{upcomingTrip.destination}</p>
          </div>
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <CalendarDays size={14} />
            <p className="text-sm">{formatDate(upcomingTrip.departureDate)}</p>
          </div>
          <p className="inline-flex rounded-full border border-[color-mix(in_oklab,var(--pink-bright),var(--pink-soft)_34%)] bg-[color-mix(in_oklab,var(--pink-soft),var(--pink-bright)_18%)] px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-on-light)]">
            {countdownLabel}
          </p>
          {upcomingTrip.note ? <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{upcomingTrip.note}</p> : null}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">No trip on deck yet.</p>
          <Button size="sm" onClick={beginEditing}>
            <Plus size={14} />
            Add Upcoming Trip
          </Button>
        </div>
      )}
    </div>
  );
}
