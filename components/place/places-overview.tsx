"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { toMonthLabel } from "@/lib/utils";

export function PlacesOverview() {
  const { countryGroups, getEntriesForCity } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");

  const totalCities = countryGroups.reduce((count, group) => count + group.cities.length, 0);
  const hasOnlyPhoenixSeed =
    totalCities === 1 &&
    countryGroups[0]?.countryCode === "US" &&
    countryGroups[0]?.cities[0]?.cityName.toLowerCase() === "phoenix";

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return countryGroups;
    }

    const query = searchQuery.trim().toLowerCase();

    return countryGroups
      .map((group) => {
        const countryMatch = group.countryName.toLowerCase().includes(query);
        if (countryMatch) {
          return group;
        }

        const cities = group.cities.filter((city) => city.cityName.toLowerCase().includes(query));
        if (cities.length === 0) {
          return null;
        }

        return {
          ...group,
          cities,
        };
      })
      .filter((group): group is (typeof countryGroups)[number] => Boolean(group));
  }, [countryGroups, searchQuery]);

  if (totalCities === 0) {
    return (
      <EmptyState
        title="No places saved"
        description="Start by adding your first city to build your travel scrapbook timeline."
      />
    );
  }

  return (
    <div className="space-y-5">
      <Card className="bg-[linear-gradient(150deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_30%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_14%)_100%)]">
        <p className="ds-input-label mb-2">Search Places</p>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            size={16}
          />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search countries or cities"
            className="pl-9"
          />
        </div>
      </Card>

      {hasOnlyPhoenixSeed ? (
        <Card className="bg-[linear-gradient(150deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_30%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_12%)_100%)]">
          <p className="ds-body">
            You currently have the seeded Phoenix example. Add your next place to expand this list.
          </p>
        </Card>
      ) : null}

      {filteredGroups.length === 0 ? (
        <EmptyState
          title="No matching places"
          description="Try searching with a different country or city name."
        />
      ) : null}

      {filteredGroups.map((group) => (
        <Card key={group.countryCode}>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2.5 border-b border-[var(--border-soft)] pb-3">
            <div>
              <p className="ds-eyebrow">Country</p>
              <h3 className="ds-section-title mt-1">{group.countryName}</h3>
            </div>
            <p className="ds-meta">
              {group.cities.length} cit{group.cities.length === 1 ? "y" : "ies"}
            </p>
          </div>

          <div className="space-y-2.5">
            {group.cities.map((city) => {
              const entries = getEntriesForCity(city.id);
              const latestEntry = entries[0];
              const firstEntry = entries[entries.length - 1];
              const photoCount = entries.reduce((count, entry) => count + entry.photoIds.length, 0);

              return (
                <Link
                  key={city.id}
                  href={`/places/${city.id}`}
                  className="group block rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-3),var(--gray-ref)_30%)] px-3.5 py-3 transition hover:border-[var(--pink-bright)] hover:bg-[color-mix(in_oklab,var(--surface-3),var(--pink-bright)_15%)]"
                >
                  <div className="grid gap-2 md:grid-cols-[minmax(0,1.5fr)_0.9fr_0.9fr_0.95fr] md:items-center">
                    <div className="min-w-0">
                      <h4 className="ds-card-title truncate">{city.cityName}</h4>
                      <p className="ds-meta mt-1 truncate">
                        {city.region ? `${city.region} • ` : ""}
                        {group.countryName}
                      </p>
                    </div>

                    <p className="ds-meta">
                      <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-[var(--text-muted)]">First Visit</span>
                      <span className="mt-0.5 block text-[var(--text-primary)]">
                        {firstEntry ? toMonthLabel(firstEntry.visitedAt) : "Unknown"}
                      </span>
                    </p>

                    <p className="ds-meta">
                      <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-[var(--text-muted)]">Most Recent</span>
                      <span className="mt-0.5 block text-[var(--text-primary)]">
                        {latestEntry ? toMonthLabel(latestEntry.visitedAt) : "No memory date"}
                      </span>
                    </p>

                    <p className="ds-meta">
                      <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.09em] text-[var(--text-muted)]">Memories / Photos</span>
                      <span className="mt-0.5 block text-[var(--text-primary)]">
                        {entries.length} / {photoCount}
                      </span>
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
