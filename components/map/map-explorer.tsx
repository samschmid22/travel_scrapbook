"use client";

import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { geoAlbersUsa, geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldGeo from "world-atlas/countries-110m.json";
import usGeo from "us-atlas/states-10m.json";

import { mapGeoCountryNameToCode } from "@/data/countries";
import { usFipsToStateCode } from "@/data/us-state-fips";
import { usStates } from "@/data/us-states";
import { useAppStore } from "@/hooks/use-app-store";
import { toMonthLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

const MAP_WIDTH = 980;
const MAP_HEIGHT = 560;
const US_MAP_HEIGHT = 430;
const MIN_SCALE = 1;
const MAX_SCALE = 8;

const worldColors = {
  ocean: "#51475a",
  unvisited: "#756d7f",
  unvisitedHover: "#878095",
  visitedPrimary: "#eb7aaa",
  visitedSecondary: "#e381ae",
  visitedHover: "#f4a8c7",
  selected: "#ff8fbc",
  stroke: "#9f92a7",
  selectedStroke: "#ffd5e6",
};
const usStateCodeSet = new Set(usStates.map((state) => state.code));

interface CountryProperties {
  name?: string;
}

interface USStateProperties {
  name?: string;
}

interface WorldTopology {
  objects: {
    countries: unknown;
  };
}

interface USTopology {
  objects: {
    states: unknown;
  };
}

type CountryFeature = Feature<Polygon | MultiPolygon, CountryProperties>;
type USStateFeature = Feature<Polygon | MultiPolygon, USStateProperties>;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hashCode(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function visitedColorForCode(code: string | undefined, fallbackName: string) {
  const hash = hashCode(`${code ?? "XX"}-${fallbackName}`);
  return hash % 2 === 0 ? worldColors.visitedPrimary : worldColors.visitedSecondary;
}

function getFipsFromFeatureId(featureId: CountryFeature["id"] | USStateFeature["id"]) {
  if (featureId === undefined || featureId === null) {
    return undefined;
  }

  return String(featureId).padStart(2, "0");
}

export function MapExplorer() {
  const { countryGroups, getEntriesForCity, usStateVisits, toggleUSStateVisited, visitedCountryCodes } = useAppStore();
  const [selectedCountry, setSelectedCountry] = useState<{ code?: string; name: string } | null>(null);
  const [hoveredCountryName, setHoveredCountryName] = useState<string | null>(null);
  const [hoveredUSStateCode, setHoveredUSStateCode] = useState<string | null>(null);
  const [selectedUSStateCode, setSelectedUSStateCode] = useState<string | null>(null);
  const [usStateQuery, setUSStateQuery] = useState("");
  const [viewState, setViewState] = useState({ scale: 1, tx: 0, ty: 0 });

  const worldFeatures = useMemo(() => {
    const topology = worldGeo as unknown as WorldTopology;
    const features = feature(
      topology as never,
      topology.objects.countries as never,
    ) as unknown as FeatureCollection<Polygon | MultiPolygon, CountryProperties>;

    return features.features as CountryFeature[];
  }, []);

  const usStateFeatures = useMemo(() => {
    const topology = usGeo as unknown as USTopology;
    const collection = feature(
      topology as never,
      topology.objects.states as never,
    ) as unknown as FeatureCollection<Polygon | MultiPolygon, USStateProperties>;

    return (collection.features as USStateFeature[]).filter((stateFeature) => {
      const fips = getFipsFromFeatureId(stateFeature.id);
      if (!fips) {
        return false;
      }

      const stateCode = usFipsToStateCode[fips];
      return Boolean(stateCode && usStateCodeSet.has(stateCode));
    });
  }, []);

  const worldPathGenerator = useMemo(() => {
    const projection = geoEqualEarth().fitSize(
      [MAP_WIDTH, MAP_HEIGHT],
      {
        type: "FeatureCollection",
        features: worldFeatures,
      } as FeatureCollection<Polygon | MultiPolygon, CountryProperties>,
    );

    return geoPath(projection);
  }, [worldFeatures]);

  const usPathGenerator = useMemo(() => {
    const projection = geoAlbersUsa().fitExtent(
      [
        [24, 18],
        [MAP_WIDTH - 24, US_MAP_HEIGHT - 18],
      ],
      {
        type: "FeatureCollection",
        features: usStateFeatures,
      } as FeatureCollection<Polygon | MultiPolygon, USStateProperties>,
    );

    return geoPath(projection);
  }, [usStateFeatures]);

  const spherePath = useMemo(() => {
    return worldPathGenerator({ type: "Sphere" });
  }, [worldPathGenerator]);

  const visitedCountrySet = useMemo(() => new Set(visitedCountryCodes), [visitedCountryCodes]);

  const usStatesByCode = useMemo(() => {
    return new Map(usStateVisits.map((state) => [state.code, state]));
  }, [usStateVisits]);

  const visitedUSStateSet = useMemo(() => {
    return new Set(usStateVisits.filter((state) => state.visited).map((state) => state.code));
  }, [usStateVisits]);

  const selectedCountryGroup = useMemo(() => {
    if (!selectedCountry?.code) {
      return undefined;
    }

    return countryGroups.find((group) => group.countryCode === selectedCountry.code);
  }, [countryGroups, selectedCountry]);

  const selectedUSState = useMemo(() => {
    if (!selectedUSStateCode) {
      return undefined;
    }

    return usStatesByCode.get(selectedUSStateCode);
  }, [selectedUSStateCode, usStatesByCode]);

  const filteredUSStates = useMemo(() => {
    const sorted = [...usStateVisits].sort((a, b) => a.name.localeCompare(b.name));
    if (!usStateQuery.trim()) {
      return sorted;
    }

    const query = usStateQuery.trim().toLowerCase();
    return sorted.filter((state) => {
      return state.name.toLowerCase().includes(query) || state.code.toLowerCase().includes(query);
    });
  }, [usStateQuery, usStateVisits]);

  const visitedUSStateCount = useMemo(() => {
    return usStateVisits.filter((state) => state.visited).length;
  }, [usStateVisits]);

  const stats = useMemo(() => {
    const cityCount = countryGroups.reduce((count, group) => count + group.cities.length, 0);
    const memoryCount = countryGroups.reduce(
      (count, group) =>
        count + group.cities.reduce((innerCount, city) => innerCount + getEntriesForCity(city.id).length, 0),
      0,
    );

    return {
      countries: visitedCountryCodes.length,
      cities: cityCount,
      memories: memoryCount,
    };
  }, [countryGroups, getEntriesForCity, visitedCountryCodes]);

  function resetWorldView() {
    setSelectedCountry(null);
    setViewState({ scale: 1, tx: 0, ty: 0 });
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

  function zoomToCountry(countryFeature: CountryFeature, nextSelection: { code?: string; name: string }) {
    const bounds = worldPathGenerator.bounds(countryFeature);
    const [[x0, y0], [x1, y1]] = bounds;
    const dx = x1 - x0;
    const dy = y1 - y0;

    if (dx <= 0 || dy <= 0 || Number.isNaN(dx) || Number.isNaN(dy)) {
      setSelectedCountry(nextSelection);
      return;
    }

    const centerX = (x0 + x1) / 2;
    const centerY = (y0 + y1) / 2;
    const padding = 68;
    const rawScale = Math.min((MAP_WIDTH - padding * 2) / dx, (MAP_HEIGHT - padding * 2) / dy);
    const scale = clamp(rawScale, 1.35, MAX_SCALE);

    setSelectedCountry(nextSelection);
    setViewState({
      scale,
      tx: MAP_WIDTH / 2 - scale * centerX,
      ty: MAP_HEIGHT / 2 - scale * centerY,
    });
  }

  async function toggleSelectedUSState() {
    if (!selectedUSState) {
      return;
    }

    await toggleUSStateVisited({
      code: selectedUSState.code,
      name: selectedUSState.name,
      visited: !selectedUSState.visited,
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="bg-[linear-gradient(140deg,color-mix(in_oklab,var(--surface-1),var(--accent-200)_16%)_0%,var(--surface-1)_100%)]">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Visited Countries</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{stats.countries}</p>
        </Card>
        <Card className="bg-[color-mix(in_oklab,var(--surface-1),var(--accent-100)_12%)]">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Saved Cities</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{stats.cities}</p>
        </Card>
        <Card className="bg-[color-mix(in_oklab,var(--surface-2),var(--accent-200)_16%)]">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Memory Entries</p>
          <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{stats.memories}</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[var(--border-soft)] px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">World map</h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => zoomAt(viewState.scale * 1.25)}>
                  <Plus size={15} />
                </Button>
                <Button size="sm" variant="secondary" onClick={() => zoomAt(viewState.scale / 1.25)}>
                  <Minus size={15} />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={resetWorldView}
                  disabled={viewState.scale <= 1 && !selectedCountry}
                >
                  Reset view
                </Button>
              </div>
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Click a country to auto-zoom. Color states are intentionally simple: visited, hover, selected, and unvisited.
            </p>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: worldColors.unvisited }} />
                Unvisited
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: worldColors.visitedPrimary }} />
                Visited
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: worldColors.visitedHover }} />
                Hover
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: worldColors.selected }} />
                Selected
              </span>
            </div>

            <div className="relative rounded-2xl border border-[var(--border-soft)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-2),var(--accent-100)_14%)_0%,color-mix(in_oklab,var(--surface-2),var(--accent-200)_10%)_100%)] p-2 sm:p-4">
              <svg
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                className="h-auto w-full"
                role="img"
                aria-label="World map"
                onClick={resetWorldView}
              >
                <g
                  style={{
                    transform: `translate(${viewState.tx}px, ${viewState.ty}px) scale(${viewState.scale})`,
                    transformOrigin: "0 0",
                    transition: "transform 520ms cubic-bezier(0.22, 0.65, 0.2, 1)",
                  }}
                >
                  {spherePath ? (
                    <path d={spherePath} fill={worldColors.ocean} stroke={worldColors.stroke} strokeWidth={0.82} />
                  ) : null}

                  {worldFeatures.map((countryFeature) => {
                    const geoName = String(countryFeature.properties?.name ?? "Unknown country");
                    const code = mapGeoCountryNameToCode(geoName);
                    const isVisited = code ? visitedCountrySet.has(code) : false;
                    const isSelected = selectedCountry?.name === geoName;
                    const isHovered = hoveredCountryName === geoName;
                    const countryPath = worldPathGenerator(countryFeature);

                    if (!countryPath) {
                      return null;
                    }

                    const visitedColor = visitedColorForCode(code, geoName);
                    let fillColor = isVisited ? visitedColor : worldColors.unvisited;

                    if (isSelected) {
                      fillColor = worldColors.selected;
                    } else if (isHovered) {
                      fillColor = isVisited ? worldColors.visitedHover : worldColors.unvisitedHover;
                    }

                    return (
                      <path
                        key={countryFeature.id?.toString() ?? geoName}
                        d={countryPath}
                        fill={fillColor}
                        stroke={isSelected ? worldColors.selectedStroke : worldColors.stroke}
                        strokeWidth={isSelected ? 1.26 : 0.64}
                        className="cursor-pointer transition-colors duration-200"
                        onClick={(event) => {
                          event.stopPropagation();
                          zoomToCountry(countryFeature, { code, name: geoName });
                        }}
                        onMouseEnter={() => setHoveredCountryName(geoName)}
                        onMouseLeave={() => setHoveredCountryName((current) => (current === geoName ? null : current))}
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

        <Card className="h-fit bg-[color-mix(in_oklab,var(--surface-1),var(--accent-100)_8%)]">
          {!selectedCountry ? (
            <EmptyState
              title="No country selected"
              description="Select a country on the map to inspect saved cities and memory activity there."
            />
          ) : (
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Country</p>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{selectedCountry.name}</h3>

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
                          className="block rounded-2xl border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-2),var(--accent-100)_14%)] px-4 py-3 transition hover:border-[var(--accent-300)] hover:bg-[color-mix(in_oklab,var(--surface-2),var(--accent-200)_18%)]"
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

              {selectedCountry.code === "US" ? (
                <div className="mt-5 rounded-2xl border border-[color-mix(in_oklab,var(--border-soft),var(--accent-300)_28%)] bg-[color-mix(in_oklab,var(--surface-2),var(--accent-200)_20%)] p-4">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">United States state tracking</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{visitedUSStateCount} / 50 states visited</p>
                  <a
                    href="#us-states-map"
                    className="mt-3 inline-flex text-sm font-medium text-[var(--accent-800)] transition hover:text-[var(--text-primary)]"
                  >
                    Open US states map
                  </a>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </div>

      <Card id="us-states-map" className="overflow-hidden p-0">
        <div className="border-b border-[var(--border-soft)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--surface-1),var(--accent-200)_16%)_0%,color-mix(in_oklab,var(--surface-1),var(--accent-100)_8%)_100%)] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">United States states map</h3>
            <Badge>
              {visitedUSStateCount} / {usStateVisits.length || 50} states visited
            </Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            US-only drill-down for all 50 states. Other countries stay country-level on the world map.
          </p>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[1fr_300px]">
          <div
            className="rounded-2xl border border-[var(--border-soft)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-2),var(--accent-100)_14%)_0%,color-mix(in_oklab,var(--surface-2),var(--accent-200)_12%)_100%)] p-2 sm:p-4"
            onClick={() => setSelectedUSStateCode(null)}
          >
            <svg viewBox={`0 0 ${MAP_WIDTH} ${US_MAP_HEIGHT}`} className="h-auto w-full" role="img" aria-label="United States states map">
              <rect x={0} y={0} width={MAP_WIDTH} height={US_MAP_HEIGHT} fill="#4b4253" rx={14} ry={14} />

              {usStateFeatures.map((stateFeature) => {
                const fips = getFipsFromFeatureId(stateFeature.id);
                if (!fips) {
                  return null;
                }

                const stateCode = usFipsToStateCode[fips];
                if (!stateCode) {
                  return null;
                }

                const statePath = usPathGenerator(stateFeature);
                if (!statePath) {
                  return null;
                }

                const isVisited = visitedUSStateSet.has(stateCode);
                const isHovered = hoveredUSStateCode === stateCode;
                const isSelected = selectedUSStateCode === stateCode;
                const stateName = usStatesByCode.get(stateCode)?.name ?? stateFeature.properties?.name ?? stateCode;

                let fill = isVisited ? visitedColorForCode(stateCode, stateName) : worldColors.unvisited;
                if (isSelected) {
                  fill = worldColors.selected;
                } else if (isHovered) {
                  fill = isVisited ? worldColors.visitedHover : worldColors.unvisitedHover;
                }

                return (
                  <path
                    key={stateCode}
                    d={statePath}
                    fill={fill}
                    stroke={isSelected ? worldColors.selectedStroke : worldColors.stroke}
                    strokeWidth={isSelected ? 1.26 : 0.72}
                    className="cursor-pointer transition-colors duration-200"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedUSStateCode(stateCode);
                    }}
                    onMouseEnter={() => setHoveredUSStateCode(stateCode)}
                    onMouseLeave={() => setHoveredUSStateCode((current) => (current === stateCode ? null : current))}
                  >
                    <title>{stateName}</title>
                  </path>
                );
              })}
            </svg>
          </div>

          <div className="space-y-3">
            <Input
              value={usStateQuery}
              onChange={(event) => setUSStateQuery(event.target.value)}
              placeholder="Search US states"
            />

            {selectedUSState ? (
              <div className="rounded-2xl border border-[color-mix(in_oklab,var(--border-soft),var(--accent-300)_34%)] bg-[color-mix(in_oklab,var(--surface-2),var(--accent-100)_20%)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Selected state</p>
                <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{selectedUSState.name}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{selectedUSState.code}</p>

                <Button className="mt-3 w-full" variant="primary" onClick={() => void toggleSelectedUSState()}>
                  {selectedUSState.visited ? "Mark as unvisited" : "Mark as visited"}
                </Button>
              </div>
            ) : (
              <EmptyState
                className="px-4 py-6"
                title="No state selected"
                description="Click any state on the map to inspect or update your US progress."
              />
            )}

            <div className="grid max-h-[280px] grid-cols-2 gap-2 overflow-auto pr-1">
              {filteredUSStates.map((state) => (
                <button
                  key={state.code}
                  type="button"
                  onClick={() => setSelectedUSStateCode(state.code)}
                  className={`rounded-xl border px-2.5 py-2 text-left text-xs transition ${
                    state.visited
                      ? "border-[color-mix(in_oklab,var(--border-soft),var(--accent-300)_44%)] bg-[color-mix(in_oklab,var(--surface-2),var(--accent-200)_20%)] text-[var(--text-primary)]"
                      : "border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-3),var(--accent-100)_8%)] text-[var(--text-secondary)] hover:border-[var(--accent-300)]"
                  }`}
                >
                  <p className="font-semibold">{state.name}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{state.code}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
