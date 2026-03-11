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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

const MAP_WIDTH = 980;
const MAP_HEIGHT = 560;

const colors = {
  ocean: "#211f27",
  unvisited: "#3a3640",
  selected: "#f0a3c3",
  stroke: "#5a5461",
  hoverStroke: "#e69dbf",
};

const visitedShades = ["#8E3E63", "#A44770", "#BC5A84", "#D16E97", "#E08AB0", "#F0A3C3"];

const yearBuckets = [
  { label: "2010 and earlier", min: Number.NEGATIVE_INFINITY, max: 2010, color: visitedShades[0] },
  { label: "2011-2015", min: 2011, max: 2015, color: visitedShades[1] },
  { label: "2016-2019", min: 2016, max: 2019, color: visitedShades[2] },
  { label: "2020-2022", min: 2020, max: 2022, color: visitedShades[3] },
  { label: "2023-2024", min: 2023, max: 2024, color: visitedShades[4] },
  { label: "2025+", min: 2025, max: Number.POSITIVE_INFINITY, color: visitedShades[5] },
];

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
  const [hoveredCountryName, setHoveredCountryName] = useState<string | null>(null);
  const [viewState, setViewState] = useState({ scale: 1, tx: 0, ty: 0 });

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

  const countryShadeIndex = useMemo(() => {
    const shadeByCountry = new Map<string, number>();

    function fallbackShadeIndex(countryCode: string) {
      const hash = countryCode.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
      return hash % visitedShades.length;
    }

    for (const group of countryGroups) {
      let earliestYear: number | null = null;

      for (const city of group.cities) {
        const entries = getEntriesForCity(city.id);
        for (const entry of entries) {
          const year = Number(entry.visitedAt.slice(0, 4));
          if (Number.isNaN(year)) {
            continue;
          }

          if (earliestYear === null || year < earliestYear) {
            earliestYear = year;
          }
        }
      }

      if (earliestYear === null) {
        shadeByCountry.set(group.countryCode, fallbackShadeIndex(group.countryCode));
        continue;
      }

      const matchedBucketIndex = yearBuckets.findIndex(
        (bucket) => earliestYear >= bucket.min && earliestYear <= bucket.max,
      );

      shadeByCountry.set(
        group.countryCode,
        matchedBucketIndex >= 0 ? matchedBucketIndex : fallbackShadeIndex(group.countryCode),
      );
    }

    return shadeByCountry;
  }, [countryGroups, getEntriesForCity]);

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

  function resetView() {
    setSelected(null);
    setViewState({ scale: 1, tx: 0, ty: 0 });
  }

  function zoomToCountry(country: CountryFeature, nextSelection: { code?: string; name: string }) {
    const bounds = pathGenerator.bounds(country);
    const [[x0, y0], [x1, y1]] = bounds;
    const dx = x1 - x0;
    const dy = y1 - y0;

    if (dx <= 0 || dy <= 0 || Number.isNaN(dx) || Number.isNaN(dy)) {
      setSelected(nextSelection);
      return;
    }

    const centerX = (x0 + x1) / 2;
    const centerY = (y0 + y1) / 2;
    const padding = 68;
    const rawScale = Math.min((MAP_WIDTH - padding * 2) / dx, (MAP_HEIGHT - padding * 2) / dy);
    const scale = Math.max(1.35, Math.min(7, rawScale));
    const tx = MAP_WIDTH / 2 - scale * centerX;
    const ty = MAP_HEIGHT / 2 - scale * centerY;

    setSelected(nextSelection);
    setViewState({ scale, tx, ty });
  }

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
        <Card className="bg-[var(--surface-3)]">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Memory Entries</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{stats.memories}</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[var(--border-soft)] px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">World map</h3>
              <Button variant="secondary" size="sm" onClick={resetView} disabled={viewState.scale <= 1 && !selected}>
                Reset view
              </Button>
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Click a country to select and smoothly zoom. Pink shades reflect first saved memory period.
            </p>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            <div className="grid gap-2 text-xs text-[var(--text-secondary)] sm:grid-cols-2 lg:grid-cols-3">
              {yearBuckets.map((bucket) => (
                <span key={bucket.label} className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: bucket.color }} />
                  {bucket.label}
                </span>
              ))}
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: colors.unvisited }} />
                Not visited
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: colors.selected }} />
                Selected
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              If a country has no valid memory year, a deterministic country-code fallback shade is used.
            </p>

            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-2 sm:p-4">
              <svg
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                className="h-auto w-full"
                role="img"
                aria-label="World map"
                onClick={resetView}
              >
                <g
                  style={{
                    transform: `translate(${viewState.tx}px, ${viewState.ty}px) scale(${viewState.scale})`,
                    transformOrigin: "0 0",
                    transition: "transform 550ms cubic-bezier(0.22, 0.65, 0.2, 1)",
                  }}
                >
                  {spherePath ? <path d={spherePath} fill={colors.ocean} stroke={colors.stroke} strokeWidth={0.8} /> : null}

                  {worldFeatures.map((country) => {
                    const geoName = String(country.properties?.name ?? "Unknown country");
                    const code = mapGeoCountryNameToCode(geoName);
                    const isVisited = code ? visitedCodes.has(code) : false;
                    const shadeIndex = code ? countryShadeIndex.get(code) ?? 0 : 0;
                    const visitedColor = visitedShades[shadeIndex];
                    const isSelected = selected?.name === geoName;
                    const isHovered = hoveredCountryName === geoName;
                    const countryPath = pathGenerator(country);

                    if (!countryPath) {
                      return null;
                    }

                    let fillColor = isVisited ? visitedColor : colors.unvisited;
                    if (isSelected) {
                      fillColor = colors.selected;
                    } else if (isHovered) {
                      fillColor = isVisited ? colors.hoverStroke : "#4a4550";
                    }

                    return (
                      <path
                        key={country.id?.toString() ?? geoName}
                        d={countryPath}
                        fill={fillColor}
                        stroke={isSelected ? "#ffd0e2" : colors.stroke}
                        strokeWidth={isSelected ? 1.1 : 0.6}
                        onClick={(event) => {
                          event.stopPropagation();
                          zoomToCountry(country, { code, name: geoName });
                        }}
                        onMouseEnter={() => setHoveredCountryName(geoName)}
                        onMouseLeave={() => setHoveredCountryName((current) => (current === geoName ? null : current))}
                        className="cursor-pointer transition-colors duration-200"
                      >
                        <title>{geoName}</title>
                      </path>
                    );
                  })}
                </g>
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
