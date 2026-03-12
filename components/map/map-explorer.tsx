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

const mapColors = {
  ocean: "#d2d6d8",
  unvisited: "#9ea1a3",
  unvisitedHover: "#8f9294",
  visited: "#ff47a2",
  visitedHover: "#ff74bb",
  selected: "#ff1f92",
  stroke: "#7f8284",
  selectedStroke: "#6e1945",
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

function getFipsFromFeatureId(featureId: CountryFeature["id"] | USStateFeature["id"]) {
  if (featureId === undefined || featureId === null) {
    return undefined;
  }

  return String(featureId).padStart(2, "0");
}

function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-5 text-sm font-medium text-[var(--text-secondary)]">
      <span className="inline-flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-full" style={{ background: mapColors.visited }} />
        Visited
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-full" style={{ background: mapColors.unvisited }} />
        Not visited
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-full" style={{ background: mapColors.selected }} />
        Selected
      </span>
    </div>
  );
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
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-[linear-gradient(140deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_24%)_0%,color-mix(in_oklab,var(--surface-2),var(--pink-soft)_16%)_100%)]">
          <p className="text-sm uppercase tracking-[0.14em] text-[var(--text-muted)]">Visited Countries</p>
          <p className="mt-3 text-4xl font-semibold text-[var(--text-primary)]">{stats.countries}</p>
        </Card>
        <Card className="bg-[color-mix(in_oklab,var(--surface-2),var(--gray-ref)_30%)]">
          <p className="text-sm uppercase tracking-[0.14em] text-[var(--text-muted)]">Saved Cities</p>
          <p className="mt-3 text-4xl font-semibold text-[var(--text-primary)]">{stats.cities}</p>
        </Card>
        <Card className="bg-[linear-gradient(140deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_26%)_0%,color-mix(in_oklab,var(--surface-2),var(--pink-soft)_12%)_100%)]">
          <p className="text-sm uppercase tracking-[0.14em] text-[var(--text-muted)]">Memory Entries</p>
          <p className="mt-3 text-4xl font-semibold text-[var(--text-primary)]">{stats.memories}</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[var(--border-soft)] px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[1.4rem] font-semibold text-[var(--text-primary)]">World map</h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => zoomAt(viewState.scale * 1.25)}>
                  <Plus size={16} />
                </Button>
                <Button size="sm" variant="secondary" onClick={() => zoomAt(viewState.scale / 1.25)}>
                  <Minus size={16} />
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
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            <MapLegend />

            <div className="relative rounded-2xl border border-[var(--border-soft)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-3),var(--gray-ref)_34%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-soft)_18%)_100%)] p-2 sm:p-4">
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
                    <path d={spherePath} fill={mapColors.ocean} stroke={mapColors.stroke} strokeWidth={0.82} />
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

                    let fillColor = isVisited ? mapColors.visited : mapColors.unvisited;

                    if (isSelected) {
                      fillColor = mapColors.selected;
                    } else if (isHovered) {
                      fillColor = isVisited ? mapColors.visitedHover : mapColors.unvisitedHover;
                    }

                    return (
                      <path
                        key={countryFeature.id?.toString() ?? geoName}
                        d={countryPath}
                        fill={fillColor}
                        stroke={isSelected ? mapColors.selectedStroke : mapColors.stroke}
                        strokeWidth={isSelected ? 1.32 : 0.64}
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

        <Card className="h-fit bg-[color-mix(in_oklab,var(--surface-2),var(--gray-ref)_26%)]">
          {!selectedCountry ? (
            <EmptyState
              title="No country selected"
              description="Select a country on the map to inspect saved cities and memory activity there."
            />
          ) : (
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-[var(--text-muted)]">Country</p>
              <h3 className="mt-2 text-[1.9rem] font-semibold text-[var(--text-primary)]">{selectedCountry.name}</h3>

              {selectedCountryGroup ? (
                <>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{selectedCountryGroup.cities.length} cities</Badge>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    {selectedCountryGroup.cities.map((city) => {
                      const entries = getEntriesForCity(city.id);
                      const latestEntry = entries[0];

                      return (
                        <Link
                          key={city.id}
                          href={`/places/${city.id}`}
                          className="block rounded-2xl border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-3),var(--gray-ref)_24%)] px-4 py-3 transition hover:border-[var(--pink-bright)] hover:bg-[color-mix(in_oklab,var(--surface-3),var(--pink-soft)_24%)]"
                        >
                          <p className="text-lg font-semibold text-[var(--text-primary)]">{city.cityName}</p>
                          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
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
                <div className="mt-5 rounded-2xl border border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_30%)] bg-[color-mix(in_oklab,var(--surface-3),var(--gray-ref)_22%)] p-4">
                  <p className="text-base font-semibold text-[var(--text-primary)]">United States state tracking</p>
                  <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{visitedUSStateCount} / 50 states visited</p>
                  <a
                    href="#us-states-map"
                    className="mt-3 inline-flex text-base font-semibold text-[var(--accent-800)] transition hover:text-[var(--text-primary)]"
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
        <div className="border-b border-[var(--border-soft)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_30%)_0%,color-mix(in_oklab,var(--surface-2),var(--pink-soft)_16%)_100%)] px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-[1.4rem] font-semibold text-[var(--text-primary)]">United States states map</h3>
            <Badge>
              {visitedUSStateCount} / {usStateVisits.length || 50} states visited
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:p-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <MapLegend />

            <div
              className="rounded-2xl border border-[var(--border-soft)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-3),var(--gray-ref)_34%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-soft)_14%)_100%)] p-2 sm:p-4"
              onClick={() => setSelectedUSStateCode(null)}
            >
              <svg viewBox={`0 0 ${MAP_WIDTH} ${US_MAP_HEIGHT}`} className="h-auto w-full" role="img" aria-label="United States states map">
                <rect x={0} y={0} width={MAP_WIDTH} height={US_MAP_HEIGHT} fill="#d8dbdd" rx={14} ry={14} />

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

                  let fill = isVisited ? mapColors.visited : mapColors.unvisited;
                  if (isSelected) {
                    fill = mapColors.selected;
                  } else if (isHovered) {
                    fill = isVisited ? mapColors.visitedHover : mapColors.unvisitedHover;
                  }

                  return (
                    <path
                      key={stateCode}
                      d={statePath}
                      fill={fill}
                      stroke={isSelected ? mapColors.selectedStroke : mapColors.stroke}
                      strokeWidth={isSelected ? 1.32 : 0.72}
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
          </div>

          <div className="space-y-3">
            <Input
              value={usStateQuery}
              onChange={(event) => setUSStateQuery(event.target.value)}
              placeholder="Search US states"
            />

            {selectedUSState ? (
              <div className="rounded-2xl border border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_34%)] bg-[color-mix(in_oklab,var(--surface-3),var(--gray-ref)_26%)] p-4">
                <p className="text-sm uppercase tracking-[0.14em] text-[var(--text-muted)]">Selected state</p>
                <p className="mt-1 text-[1.25rem] font-semibold text-[var(--text-primary)]">{selectedUSState.name}</p>
                <p className="mt-1 text-base text-[var(--text-secondary)]">{selectedUSState.code}</p>

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

            <div className="grid max-h-[300px] grid-cols-2 gap-2 overflow-auto pr-1">
              {filteredUSStates.map((state) => (
                <button
                  key={state.code}
                  type="button"
                  onClick={() => setSelectedUSStateCode(state.code)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    state.visited
                      ? "border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_45%)] bg-[color-mix(in_oklab,var(--surface-3),var(--pink-soft)_20%)] text-[var(--text-primary)]"
                      : "border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-3),var(--gray-ref)_32%)] text-[var(--text-secondary)] hover:border-[var(--pink-bright)]"
                  }`}
                >
                  <p className="font-semibold">{state.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">{state.code}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
