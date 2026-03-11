"use client";

import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import Link from "next/link";
import { useMemo, useState } from "react";
import { geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldGeo from "world-atlas/countries-110m.json";

import { mapGeoCountryNameToCode } from "@/data/countries";
import { useAppStore } from "@/hooks/use-app-store";
import { toMonthLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

const MAP_WIDTH = 980;
const MAP_HEIGHT = 560;

const colors = {
  ocean: "#f8ecef",
  unvisited: "#eedce3",
  visited: "#6f6873",
  selected: "#5f5668",
  stroke: "#bba8b2",
  hoverStroke: "#7f7485",
};

interface CountryProperties {
  name?: string;
}

interface WorldTopology {
  objects: {
    countries: unknown;
  };
}

type CountryFeature = Feature<Polygon | MultiPolygon, CountryProperties>;

export function MapExplorer() {
  const { countryGroups, getEntriesForCity } = useAppStore();
  const [selected, setSelected] = useState<{ code?: string; name: string } | null>(null);

  const worldFeatures = useMemo(() => {
    const topology = worldGeo as unknown as WorldTopology;
    const features = feature(
      topology as never,
      topology.objects.countries as never,
    ) as unknown as FeatureCollection<Polygon | MultiPolygon, CountryProperties>;

    return features.features as CountryFeature[];
  }, []);

  const pathGenerator = useMemo(() => {
    const projection = geoEqualEarth().fitSize(
      [MAP_WIDTH, MAP_HEIGHT],
      {
        type: "FeatureCollection",
        features: worldFeatures,
      } as FeatureCollection<Polygon | MultiPolygon, CountryProperties>,
    );

    return geoPath(projection);
  }, [worldFeatures]);

  const spherePath = useMemo(() => {
    return pathGenerator({ type: "Sphere" });
  }, [pathGenerator]);

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
          <p className="text-xs uppercase tracking-[0.18em] text-white/80">Memory Entries</p>
          <p className="mt-3 text-3xl font-semibold">{stats.memories}</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[var(--border-soft)] px-5 py-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">World map</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Mauve-gray countries are visited. Click any country to inspect your saved places.
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
              <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="h-auto w-full" role="img" aria-label="World map">
                {spherePath ? <path d={spherePath} fill={colors.ocean} stroke={colors.stroke} strokeWidth={0.8} /> : null}

                {worldFeatures.map((country) => {
                  const geoName = String(country.properties?.name ?? "Unknown country");
                  const code = mapGeoCountryNameToCode(geoName);
                  const isVisited = code ? visitedCodes.has(code) : false;
                  const isSelected = selected?.name === geoName;
                  const countryPath = pathGenerator(country);

                  if (!countryPath) {
                    return null;
                  }

                  return (
                    <path
                      key={country.id?.toString() ?? geoName}
                      d={countryPath}
                      fill={isSelected ? colors.selected : isVisited ? colors.visited : colors.unvisited}
                      stroke={isSelected ? colors.hoverStroke : colors.stroke}
                      strokeWidth={0.6}
                      onClick={() => setSelected({ code, name: geoName })}
                      className="cursor-pointer transition-colors duration-150"
                    >
                      <title>{geoName}</title>
                    </path>
                  );
                })}
              </svg>
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
