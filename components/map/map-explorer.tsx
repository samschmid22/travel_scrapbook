"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Sphere } from "react-simple-maps";
import worldGeo from "world-atlas/countries-110m.json";

import { mapGeoCountryNameToCode } from "@/data/countries";
import { useAppStore } from "@/hooks/use-app-store";
import { toMonthLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

const colors = {
  ocean: "#f7eaf0",
  unvisited: "#f0dee6",
  visited: "#2f2733",
  selected: "#61445b",
  stroke: "#bca6b2",
  hoverStroke: "#8e7484",
};

interface MapGeography {
  rsmKey: string;
  properties?: {
    name?: string;
  };
}

export function MapExplorer() {
  const { countryGroups, getEntriesForCity } = useAppStore();
  const [selected, setSelected] = useState<{ code?: string; name: string } | null>(null);

  const visitedCodes = useMemo(() => new Set(countryGroups.map((group) => group.countryCode)), [countryGroups]);

  const selectedCountryGroup = useMemo(() => {
    if (!selected?.code) {
      return undefined;
    }

    return countryGroups.find((group) => group.countryCode === selected.code);
  }, [countryGroups, selected]);

  const stats = useMemo(() => {
    const cityCount = countryGroups.reduce((count, group) => count + group.cities.length, 0);
    const memoryCount = countryGroups.reduce(
      (count, group) =>
        count + group.cities.reduce((innerCount, city) => innerCount + getEntriesForCity(city.id).length, 0),
      0,
    );

    return {
      countries: countryGroups.length,
      cities: cityCount,
      memories: memoryCount,
    };
  }, [countryGroups, getEntriesForCity]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Visited Countries</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{stats.countries}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Saved Cities</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{stats.cities}</p>
        </Card>
        <Card className="bg-[var(--card-strong)] text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-white/70">Memory Entries</p>
          <p className="mt-3 text-3xl font-semibold">{stats.memories}</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[var(--border-soft)] px-5 py-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">World map</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Dark countries are visited. Click any country to inspect your saved places.
            </p>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: colors.visited }} />
                Visited
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: colors.unvisited }} />
                Not visited
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: colors.selected }} />
                Selected
              </span>
            </div>

            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-2 sm:p-4">
              <ComposableMap
                projection="geoEqualEarth"
                projectionConfig={{ scale: 165 }}
                style={{ width: "100%", height: "auto" }}
              >
                <Sphere fill={colors.ocean} stroke={colors.stroke} strokeWidth={0.2} />
                <Geographies geography={worldGeo as never}>
                  {({ geographies }: { geographies: MapGeography[] }) =>
                    geographies.map((geo: MapGeography) => {
                      const geoName = String(geo.properties?.name ?? "Unknown country");
                      const code = mapGeoCountryNameToCode(geoName);
                      const isVisited = code ? visitedCodes.has(code) : false;
                      const isSelected = selected?.name === geoName;

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          stroke={isSelected ? colors.hoverStroke : colors.stroke}
                          strokeWidth={0.5}
                          onClick={() => setSelected({ code, name: geoName })}
                          style={{
                            default: {
                              fill: isSelected
                                ? colors.selected
                                : isVisited
                                  ? colors.visited
                                  : colors.unvisited,
                              outline: "none",
                              transition: "all 0.18s ease",
                            },
                            hover: {
                              fill: isVisited ? "#423347" : "#e7d2dc",
                              outline: "none",
                            },
                            pressed: {
                              fill: isSelected ? colors.selected : isVisited ? "#4f3f55" : "#e0c9d3",
                              outline: "none",
                            },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ComposableMap>
            </div>
          </div>
        </Card>

        <Card className="h-fit">
          {!selected ? (
            <EmptyState
              title="No country selected"
              description="Select a country on the map to inspect cities and memories saved there."
            />
          ) : (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Country</p>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{selected.name}</h3>

              {selectedCountryGroup ? (
                <>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{selectedCountryGroup.cities.length} cities</Badge>
                  </div>

                  <div className="mt-4 space-y-2">
                    {selectedCountryGroup.cities.map((city) => {
                      const entries = getEntriesForCity(city.id);
                      const latestEntry = entries[0];
                      return (
                        <Link
                          key={city.id}
                          href={`/places/${city.id}`}
                          className="block rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-3 transition hover:border-[var(--accent-300)] hover:bg-[var(--surface-1)]"
                        >
                          <p className="font-medium text-[var(--text-primary)]">{city.cityName}</p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            {city.region ? `${city.region} • ` : ""}
                            {entries.length} memories
                            {latestEntry ? ` • Last ${toMonthLabel(latestEntry.visitedAt)}` : ""}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                </>
              ) : (
                <EmptyState
                  className="mt-5"
                  title="No places saved yet"
                  description="You have not added any cities in this country yet."
                />
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
