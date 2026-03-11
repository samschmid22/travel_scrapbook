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
    <div className="space-y-4">
      <Card className="bg-[color-mix(in_oklab,var(--surface-1),var(--accent-100)_20%)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search countries or cities"
            className="pl-9"
          />
        </div>
      </Card>

      {hasOnlyPhoenixSeed ? (
        <Card className="bg-[color-mix(in_oklab,var(--surface-2),var(--accent-100)_24%)]">
          <p className="text-sm text-[var(--text-secondary)]">
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
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border-soft)] pb-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Country</p>
              <h3 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{group.countryName}</h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              {group.cities.length} cit{group.cities.length === 1 ? "y" : "ies"}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {group.cities.map((city) => {
              const entries = getEntriesForCity(city.id);
              const latestEntry = entries[0];
              const firstEntry = entries[entries.length - 1];
              const photoCount = entries.reduce((count, entry) => count + entry.photoIds.length, 0);

              return (
                <Link
                  key={city.id}
                  href={`/places/${city.id}`}
                  className="group rounded-2xl border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-2),var(--accent-100)_18%)] p-4 transition hover:border-[var(--accent-300)] hover:bg-[var(--surface-1)]"
                >
                  <h4 className="text-lg font-semibold text-[var(--text-primary)]">{city.cityName}</h4>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {city.region ? `${city.region} • ` : ""}
                    {group.countryName}
                  </p>

                  <div className="mt-3 space-y-1 text-xs text-[var(--text-secondary)]">
                    <p>
                      Most recent: {latestEntry ? toMonthLabel(latestEntry.visitedAt) : "No memory date"}
                    </p>
                    <p>First visit: {firstEntry ? toMonthLabel(firstEntry.visitedAt) : "Unknown"}</p>
                    <p>
                      {entries.length} memory {entries.length === 1 ? "entry" : "entries"} • {photoCount} photo
                      {photoCount === 1 ? "" : "s"}
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
