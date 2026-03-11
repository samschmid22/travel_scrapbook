"use client";

import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";

const MAP_WIDTH = 980;
const MAP_HEIGHT = 560;
const MIN_SCALE = 1;
const MAX_SCALE = 8;

const colors = {
  ocean: "#3a3340",
  unvisited: "#686172",
  selected: "#f0a3c3",
  stroke: "#8a8092",
  hoverStroke: "#f3b8d1",
};

const visitedShades = ["#8E3E63", "#A44770", "#BC5A84", "#D16E97", "#E08AB0", "#C95C8A"];

interface CountryProperties {
  name?: string;
}

interface WorldTopology {
  objects: {
    countries: unknown;
  };
}

type CountryFeature = Feature<Polygon | MultiPolygon, CountryProperties>;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function shadeIndexForCountry(countryCode: string | undefined, countryName: string) {
  const seed = `${countryCode ?? "XX"}-${countryName}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return hash % visitedShades.length;
}

export function MapExplorer() {
  const { countryGroups, getEntriesForCity, usStateVisits, toggleUSStateVisited, visitedCountryCodes } = useAppStore();
  const [selected, setSelected] = useState<{ code?: string; name: string } | null>(null);
  const [hoveredCountryName, setHoveredCountryName] = useState<string | null>(null);
  const [viewState, setViewState] = useState({ scale: 1, tx: 0, ty: 0 });
  const [usStateQuery, setUSStateQuery] = useState("");

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

  const visitedCodes = useMemo(() => new Set(visitedCountryCodes), [visitedCountryCodes]);

  const selectedCountryGroup = useMemo(() => {
    if (!selected?.code) {
      return undefined;
    }

    return countryGroups.find((group) => group.countryCode === selected.code);
  }, [countryGroups, selected]);

  const usStateRows = useMemo(() => {
    const sorted = [...usStateVisits].sort((a, b) => a.name.localeCompare(b.name));
    if (!usStateQuery.trim()) {
      return sorted;
    }

    const query = usStateQuery.trim().toLowerCase();
    return sorted.filter((state) => state.name.toLowerCase().includes(query) || state.code.toLowerCase().includes(query));
  }, [usStateQuery, usStateVisits]);

  const visitedUSStateCount = useMemo(() => usStateVisits.filter((state) => state.visited).length, [usStateVisits]);

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
    setUSStateQuery("");
  }

  function zoomAt(nextScaleValue: number) {
    setViewState((current) => {
      const nextScale = clamp(nextScaleValue, MIN_SCALE, MAX_SCALE);
      if (nextScale === current.scale) {
        return current;
      }

      const anchorX = MAP_WIDTH / 2;
      const anchorY = MAP_HEIGHT / 2;
      const worldX = (anchorX - current.tx) / current.scale;
      const worldY = (anchorY - current.ty) / current.scale;

      return {
        scale: nextScale,
        tx: anchorX - nextScale * worldX,
        ty: anchorY - nextScale * worldY,
      };
    });
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
    const scale = clamp(rawScale, 1.35, MAX_SCALE);
    const tx = MAP_WIDTH / 2 - scale * centerX;
    const ty = MAP_HEIGHT / 2 - scale * centerY;

    setSelected(nextSelection);
    if (nextSelection.code !== "US") {
      setUSStateQuery("");
    }
    setViewState({ scale, tx, ty });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="bg-[color-mix(in_oklab,var(--surface-1),var(--accent-100)_22%)]">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Visited Countries</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{stats.countries}</p>
        </Card>
        <Card className="bg-[color-mix(in_oklab,var(--surface-1),var(--accent-100)_18%)]">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Saved Cities</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{stats.cities}</p>
        </Card>
        <Card className="bg-[color-mix(in_oklab,var(--surface-2),var(--accent-100)_28%)]">
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
              Click a country to auto-zoom. Visited countries use varied pink shades for quick visual distinction.
            </p>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-muted)]">Visited shades</span>
              {visitedShades.map((shade) => (
                <span key={shade} className="inline-flex h-3 w-3 rounded-full" style={{ background: shade }} />
              ))}
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: colors.unvisited }} />
                Unvisited
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: colors.selected }} />
                Selected
              </span>
            </div>

            <div className="relative rounded-2xl border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-2),var(--accent-100)_20%)] p-2 sm:p-4">
              <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => zoomAt(viewState.scale * 1.25)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-3)] text-[var(--text-primary)] shadow-lg transition hover:border-[var(--accent-300)] hover:bg-[var(--accent-100)]"
                  aria-label="Zoom in"
                >
                  <Plus size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => zoomAt(viewState.scale / 1.25)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-3)] text-[var(--text-primary)] shadow-lg transition hover:border-[var(--accent-300)] hover:bg-[var(--accent-100)]"
                  aria-label="Zoom out"
                >
                  <Minus size={15} />
                </button>
              </div>

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
                    transition: "transform 520ms cubic-bezier(0.22, 0.65, 0.2, 1)",
                  }}
                >
                  {spherePath ? <path d={spherePath} fill={colors.ocean} stroke={colors.stroke} strokeWidth={0.8} /> : null}

                  {worldFeatures.map((country) => {
                    const geoName = String(country.properties?.name ?? "Unknown country");
                    const code = mapGeoCountryNameToCode(geoName);
                    const isVisited = code ? visitedCodes.has(code) : false;
                    const shadeIndex = shadeIndexForCountry(code, geoName);
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
                      fillColor = isVisited ? colors.hoverStroke : "#7a7385";
                    }

                    return (
                      <path
                        key={country.id?.toString() ?? geoName}
                        d={countryPath}
                        fill={fillColor}
                        stroke={isSelected ? "#ffd4e4" : colors.stroke}
                        strokeWidth={isSelected ? 1.2 : 0.6}
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
                          className="block rounded-2xl border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-2),var(--accent-100)_15%)] px-4 py-3 transition hover:border-[var(--accent-300)] hover:bg-[var(--surface-1)]"
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

              {selected.code === "US" ? (
                <div className="mt-5 rounded-2xl border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-2),var(--accent-100)_24%)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">United States detail</p>
                    <Badge>
                      {visitedUSStateCount} / {usStateVisits.length || 50} states visited
                    </Badge>
                  </div>

                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    US-only state tracking path. Other countries remain country-level.
                  </p>

                  <div className="mt-3">
                    <Input
                      value={usStateQuery}
                      onChange={(event) => setUSStateQuery(event.target.value)}
                      placeholder="Search US states"
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {usStateRows.map((state) => (
                      <button
                        key={state.code}
                        type="button"
                        onClick={() => {
                          void toggleUSStateVisited({
                            code: state.code,
                            name: state.name,
                            visited: !state.visited,
                          });
                        }}
                        className={`rounded-xl border px-2.5 py-2 text-left text-xs transition ${
                          state.visited
                            ? "border-[var(--accent-300)] bg-[var(--accent-200)]/35 text-[var(--text-primary)]"
                            : "border-[var(--border-soft)] bg-[var(--surface-3)] text-[var(--text-secondary)] hover:border-[var(--accent-300)]"
                        }`}
                      >
                        <p className="font-semibold">{state.name}</p>
                        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{state.code}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
