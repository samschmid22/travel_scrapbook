"use client";

import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { geoAlbersUsa, geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldGeo from "world-atlas/countries-110m.json";
import usGeo from "us-atlas/states-10m.json";

import { getContinentForCountryCode } from "@/data/continents";
import { findCityCoordinates, mapGeoCountryNameToCode } from "@/data/countries";
import { usFipsToStateCode } from "@/data/us-state-fips";
import { getUSStateCodeFromRegion, usStates } from "@/data/us-states";
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
  ocean: "#655d72",
  unvisited: "#6f677f",
  unvisitedHover: "#837a93",
  visited: "#d63b8d",
  visitedHover: "#ea5ca8",
  selected: "#ff47a2",
  stroke: "#ffdef0",
  selectedStroke: "#ffdef0",
  pin: "#ff47a2",
  pinHalo: "#ffdef0",
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

interface ViewState {
  scale: number;
  tx: number;
  ty: number;
}

interface MapPin {
  id: string;
  label: string;
  x: number;
  y: number;
  memoryCount: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampViewState(next: ViewState, width: number, height: number): ViewState {
  if (next.scale <= 1) {
    return { scale: 1, tx: 0, ty: 0 };
  }

  const minTx = width - width * next.scale;
  const minTy = height - height * next.scale;

  return {
    scale: next.scale,
    tx: clamp(next.tx, minTx, 0),
    ty: clamp(next.ty, minTy, 0),
  };
}

function zoomAroundCenter(current: ViewState, width: number, height: number, nextScaleValue: number): ViewState {
  const nextScale = clamp(nextScaleValue, MIN_SCALE, MAX_SCALE);
  if (nextScale === current.scale) {
    return current;
  }

  const anchorX = width / 2;
  const anchorY = height / 2;
  const worldX = (anchorX - current.tx) / current.scale;
  const worldY = (anchorY - current.ty) / current.scale;

  return clampViewState(
    {
      scale: nextScale,
      tx: anchorX - nextScale * worldX,
      ty: anchorY - nextScale * worldY,
    },
    width,
    height,
  );
}

function getFipsFromFeatureId(featureId: CountryFeature["id"] | USStateFeature["id"]) {
  if (featureId === undefined || featureId === null) {
    return undefined;
  }

  return String(featureId).padStart(2, "0");
}

function applyPinOffsets(pins: MapPin[]) {
  const offsets = [
    [0, 0],
    [6, 0],
    [-6, 0],
    [0, 6],
    [0, -6],
    [4.5, 4.5],
    [4.5, -4.5],
    [-4.5, 4.5],
    [-4.5, -4.5],
  ] as const;

  const bucketCounts = new Map<string, number>();

  return pins.map((pin) => {
    const key = `${Math.round(pin.x / 8)}-${Math.round(pin.y / 8)}`;
    const index = bucketCounts.get(key) ?? 0;
    bucketCounts.set(key, index + 1);

    const [ox, oy] = offsets[index % offsets.length];
    return {
      ...pin,
      x: pin.x + ox,
      y: pin.y + oy,
    };
  });
}

function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-5 text-sm font-medium text-[var(--text-secondary)]">
      <span className="inline-flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-full" style={{ background: mapColors.unvisited }} />
        Not visited
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-full" style={{ background: mapColors.visited }} />
        Visited
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-full" style={{ background: mapColors.selected }} />
        Selected
      </span>
    </div>
  );
}

const progressBadgeClassName =
  "border-[color-mix(in_oklab,var(--pink-dark),var(--pink-soft)_28%)] bg-[linear-gradient(120deg,var(--pink-bright)_0%,color-mix(in_oklab,var(--pink-bright),var(--pink-dark)_28%)_100%)] text-[var(--pink-soft)] shadow-[0_14px_24px_-14px_rgba(255,71,162,0.72)]";

export function MapExplorer() {
  const { cities, countryGroups, getEntriesForCity, usStateVisits, toggleUSStateVisited, visitedCountryCodes } = useAppStore();
  const [selectedCountry, setSelectedCountry] = useState<{ code?: string; name: string } | null>(null);
  const [hoveredCountryName, setHoveredCountryName] = useState<string | null>(null);
  const [hoveredUSStateCode, setHoveredUSStateCode] = useState<string | null>(null);
  const [selectedUSStateCode, setSelectedUSStateCode] = useState<string | null>(null);
  const [usStateQuery, setUSStateQuery] = useState("");
  const [worldViewState, setWorldViewState] = useState<ViewState>({ scale: 1, tx: 0, ty: 0 });
  const [usViewState, setUSViewState] = useState<ViewState>({ scale: 1, tx: 0, ty: 0 });

  const worldDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startTx: number;
    startTy: number;
  } | null>(null);
  const usDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startTx: number;
    startTy: number;
  } | null>(null);
  const worldMovedRef = useRef(false);
  const usMovedRef = useRef(false);

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

  const worldProjection = useMemo(() => {
    return geoEqualEarth().fitSize(
      [MAP_WIDTH, MAP_HEIGHT],
      {
        type: "FeatureCollection",
        features: worldFeatures,
      } as FeatureCollection<Polygon | MultiPolygon, CountryProperties>,
    );
  }, [worldFeatures]);

  const usProjection = useMemo(() => {
    return geoAlbersUsa().fitExtent(
      [
        [24, 18],
        [MAP_WIDTH - 24, US_MAP_HEIGHT - 18],
      ],
      {
        type: "FeatureCollection",
        features: usStateFeatures,
      } as FeatureCollection<Polygon | MultiPolygon, USStateProperties>,
    );
  }, [usStateFeatures]);

  const worldPathGenerator = useMemo(() => geoPath(worldProjection), [worldProjection]);
  const usPathGenerator = useMemo(() => geoPath(usProjection), [usProjection]);

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
    const continents = new Set<ReturnType<typeof getContinentForCountryCode>>();
    for (const countryCode of visitedCountryCodes) {
      continents.add(getContinentForCountryCode(countryCode));
    }
    continents.delete(undefined);

    return {
      countries: visitedCountryCodes.length,
      cities: cityCount,
      continents: continents.size,
    };
  }, [countryGroups, visitedCountryCodes]);

  const worldPins = useMemo(() => {
    if (!selectedCountryGroup) {
      return [] as MapPin[];
    }

    const pins: MapPin[] = [];
    for (const city of selectedCountryGroup.cities) {
      const coordinates =
        city.latitude !== undefined && city.longitude !== undefined
          ? { latitude: city.latitude, longitude: city.longitude }
          : findCityCoordinates(city.countryCode, city.cityName, city.region);

      if (!coordinates) {
        continue;
      }

      const projected = worldProjection([coordinates.longitude, coordinates.latitude]);
      if (!projected) {
        continue;
      }

      const [x, y] = projected;
      const memoryCount = getEntriesForCity(city.id).length;
      pins.push({
        id: city.id,
        label: city.region ? `${city.cityName}, ${city.region}` : city.cityName,
        x,
        y,
        memoryCount,
      });
    }

    return applyPinOffsets(pins);
  }, [getEntriesForCity, selectedCountryGroup, worldProjection]);

  const selectedUSStateCities = useMemo(() => {
    if (!selectedUSStateCode) {
      return [];
    }

    return cities.filter((city) => {
      if (city.countryCode !== "US") {
        return false;
      }

      return getUSStateCodeFromRegion(city.region) === selectedUSStateCode;
    });
  }, [cities, selectedUSStateCode]);

  const usPins = useMemo(() => {
    if (!selectedUSStateCode) {
      return [] as MapPin[];
    }

    const pins: MapPin[] = [];
    for (const city of selectedUSStateCities) {
      const coordinates =
        city.latitude !== undefined && city.longitude !== undefined
          ? { latitude: city.latitude, longitude: city.longitude }
          : findCityCoordinates("US", city.cityName, city.region);

      if (!coordinates) {
        continue;
      }

      const projected = usProjection([coordinates.longitude, coordinates.latitude]);
      if (!projected) {
        continue;
      }

      const [x, y] = projected;
      const memoryCount = getEntriesForCity(city.id).length;
      pins.push({
        id: city.id,
        label: city.region ? `${city.cityName}, ${city.region}` : city.cityName,
        x,
        y,
        memoryCount,
      });
    }

    return applyPinOffsets(pins);
  }, [getEntriesForCity, selectedUSStateCities, selectedUSStateCode, usProjection]);

  function resetWorldView() {
    setSelectedCountry(null);
    setWorldViewState({ scale: 1, tx: 0, ty: 0 });
  }

  function resetUSView() {
    setSelectedUSStateCode(null);
    setUSViewState({ scale: 1, tx: 0, ty: 0 });
  }

  function zoomWorldAt(nextScaleValue: number) {
    setWorldViewState((current) => zoomAroundCenter(current, MAP_WIDTH, MAP_HEIGHT, nextScaleValue));
  }

  function zoomUSAt(nextScaleValue: number) {
    setUSViewState((current) => zoomAroundCenter(current, MAP_WIDTH, US_MAP_HEIGHT, nextScaleValue));
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
    setWorldViewState(
      clampViewState(
        {
          scale,
          tx: MAP_WIDTH / 2 - scale * centerX,
          ty: MAP_HEIGHT / 2 - scale * centerY,
        },
        MAP_WIDTH,
        MAP_HEIGHT,
      ),
    );
  }

  function zoomToUSState(stateFeature: USStateFeature, stateCode: string) {
    const bounds = usPathGenerator.bounds(stateFeature);
    const [[x0, y0], [x1, y1]] = bounds;
    const dx = x1 - x0;
    const dy = y1 - y0;

    if (dx <= 0 || dy <= 0 || Number.isNaN(dx) || Number.isNaN(dy)) {
      setSelectedUSStateCode(stateCode);
      return;
    }

    const centerX = (x0 + x1) / 2;
    const centerY = (y0 + y1) / 2;
    const padding = 54;
    const rawScale = Math.min((MAP_WIDTH - padding * 2) / dx, (US_MAP_HEIGHT - padding * 2) / dy);
    const scale = clamp(rawScale, 1.35, 6);

    setSelectedUSStateCode(stateCode);
    setUSViewState(
      clampViewState(
        {
          scale,
          tx: MAP_WIDTH / 2 - scale * centerX,
          ty: US_MAP_HEIGHT / 2 - scale * centerY,
        },
        MAP_WIDTH,
        US_MAP_HEIGHT,
      ),
    );
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

  function handleWorldPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (worldViewState.scale <= 1) {
      return;
    }

    worldMovedRef.current = false;
    worldDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTx: worldViewState.tx,
      startTy: worldViewState.ty,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleWorldPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = worldDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      worldMovedRef.current = true;
    }

    setWorldViewState(
      clampViewState(
        {
          scale: worldViewState.scale,
          tx: drag.startTx + dx,
          ty: drag.startTy + dy,
        },
        MAP_WIDTH,
        MAP_HEIGHT,
      ),
    );
  }

  function handleWorldPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = worldDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    worldDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleUSPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (usViewState.scale <= 1) {
      return;
    }

    usMovedRef.current = false;
    usDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTx: usViewState.tx,
      startTy: usViewState.ty,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleUSPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = usDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      usMovedRef.current = true;
    }

    setUSViewState(
      clampViewState(
        {
          scale: usViewState.scale,
          tx: drag.startTx + dx,
          ty: drag.startTy + dy,
        },
        MAP_WIDTH,
        US_MAP_HEIGHT,
      ),
    );
  }

  function handleUSPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = usDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    usDragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-[linear-gradient(140deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_30%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_14%)_100%)]">
          <p className="text-sm uppercase tracking-[0.14em] text-[var(--text-muted)]">Visited Countries</p>
          <p className="mt-3 text-4xl font-semibold text-[var(--text-primary)]">{stats.countries}</p>
        </Card>
        <Card className="bg-[linear-gradient(145deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_28%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_10%)_100%)]">
          <p className="text-sm uppercase tracking-[0.14em] text-[var(--text-muted)]">Visited Cities</p>
          <p className="mt-3 text-4xl font-semibold text-[var(--text-primary)]">{stats.cities}</p>
        </Card>
        <Card className="bg-[linear-gradient(140deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_28%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_15%)_100%)]">
          <p className="text-sm uppercase tracking-[0.14em] text-[var(--text-muted)]">Visited Continents</p>
          <p className="mt-3 text-4xl font-semibold text-[var(--text-primary)]">{stats.continents}</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[var(--border-soft)] px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[1.4rem] font-semibold text-[var(--text-primary)]">World Map</h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => zoomWorldAt(worldViewState.scale * 1.25)}>
                  <Plus size={16} />
                </Button>
                <Button size="sm" variant="secondary" onClick={() => zoomWorldAt(worldViewState.scale / 1.25)}>
                  <Minus size={16} />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={resetWorldView}
                  disabled={worldViewState.scale <= 1 && !selectedCountry}
                >
                  Reset View
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            <MapLegend />

            <div className="relative rounded-2xl border border-[var(--border-soft)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-3),var(--gray-ref)_30%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_16%)_100%)] p-2 sm:p-4">
              <svg
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                className="h-auto w-full touch-none"
                role="img"
                aria-label="World Map"
                onClick={() => {
                  if (worldMovedRef.current) {
                    worldMovedRef.current = false;
                    return;
                  }
                  resetWorldView();
                }}
                onPointerDown={handleWorldPointerDown}
                onPointerMove={handleWorldPointerMove}
                onPointerUp={handleWorldPointerUp}
                onPointerCancel={handleWorldPointerUp}
              >
                <g
                  style={{
                    transform: `translate(${worldViewState.tx}px, ${worldViewState.ty}px) scale(${worldViewState.scale})`,
                    transformOrigin: "0 0",
                    transition: worldDragRef.current ? "none" : "transform 520ms cubic-bezier(0.22, 0.65, 0.2, 1)",
                  }}
                >
                  {spherePath ? (
                    <path d={spherePath} fill={mapColors.ocean} stroke={mapColors.stroke} strokeWidth={0.84} />
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
                        strokeWidth={isSelected ? 1.34 : 0.68}
                        className="cursor-pointer transition-colors duration-200"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (worldMovedRef.current) {
                            worldMovedRef.current = false;
                            return;
                          }
                          zoomToCountry(countryFeature, { code, name: geoName });
                        }}
                        onMouseEnter={() => setHoveredCountryName(geoName)}
                        onMouseLeave={() => setHoveredCountryName((current) => (current === geoName ? null : current))}
                      >
                        <title>{geoName}</title>
                      </path>
                    );
                  })}

                  {worldPins.map((pin) => (
                    <g key={pin.id} className="pointer-events-auto">
                      <circle cx={pin.x} cy={pin.y} r={5.2} fill={mapColors.pinHalo} opacity={0.8} />
                      <circle cx={pin.x} cy={pin.y} r={3.2} fill={mapColors.pin} />
                      <title>
                        {pin.label} · {pin.memoryCount} memor{pin.memoryCount === 1 ? "y" : "ies"}
                      </title>
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          </div>
        </Card>

        <Card className="h-fit bg-[linear-gradient(155deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_30%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_10%)_100%)]">
          {!selectedCountry ? (
            <EmptyState
              title="No Country Selected"
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
                          className="block rounded-2xl border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-3),var(--gray-ref)_26%)] px-4 py-3 transition hover:border-[var(--pink-bright)] hover:bg-[color-mix(in_oklab,var(--surface-3),var(--pink-bright)_18%)]"
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
                  title="No Places Saved Yet"
                  description="You have not added any cities in this country yet."
                />
              )}

              {selectedCountry.code === "US" ? (
                <div className="mt-5 rounded-2xl border border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_30%)] bg-[color-mix(in_oklab,var(--surface-3),var(--pink-bright)_12%)] p-4">
                  <p className="text-base font-semibold text-[var(--text-primary)]">United States state tracking</p>
                  <div className="mt-2">
                    <Badge className={progressBadgeClassName}>{visitedUSStateCount} / 50 States Visited</Badge>
                  </div>
                  <a
                    href="#us-states-map"
                    className="mt-3 inline-flex text-base font-semibold text-[var(--accent-800)] transition hover:text-[var(--text-primary)]"
                  >
                    Open United States Map
                  </a>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </div>

      <div id="us-states-map" className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[var(--border-soft)] bg-[linear-gradient(145deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_30%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_14%)_100%)] px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[1.4rem] font-semibold text-[var(--text-primary)]">United States Map</h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => zoomUSAt(usViewState.scale * 1.25)}>
                  <Plus size={16} />
                </Button>
                <Button size="sm" variant="secondary" onClick={() => zoomUSAt(usViewState.scale / 1.25)}>
                  <Minus size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={resetUSView}
                  disabled={usViewState.scale <= 1 && !selectedUSStateCode}
                >
                  Reset View
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <MapLegend />
              <Badge className={progressBadgeClassName}>
                {visitedUSStateCount} / {usStateVisits.length || 50} States Visited
              </Badge>
            </div>

            <div className="rounded-2xl border border-[var(--border-soft)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-3),var(--gray-ref)_30%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_14%)_100%)] p-2 sm:p-4">
              <svg
                viewBox={`0 0 ${MAP_WIDTH} ${US_MAP_HEIGHT}`}
                className="h-auto w-full touch-none"
                role="img"
                aria-label="United States Map"
                onClick={() => {
                  if (usMovedRef.current) {
                    usMovedRef.current = false;
                    return;
                  }
                  setSelectedUSStateCode(null);
                }}
                onPointerDown={handleUSPointerDown}
                onPointerMove={handleUSPointerMove}
                onPointerUp={handleUSPointerUp}
                onPointerCancel={handleUSPointerUp}
              >
                <g
                  style={{
                    transform: `translate(${usViewState.tx}px, ${usViewState.ty}px) scale(${usViewState.scale})`,
                    transformOrigin: "0 0",
                    transition: usDragRef.current ? "none" : "transform 520ms cubic-bezier(0.22, 0.65, 0.2, 1)",
                  }}
                >
                  <rect x={0} y={0} width={MAP_WIDTH} height={US_MAP_HEIGHT} fill={mapColors.ocean} rx={14} ry={14} />

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
                        strokeWidth={isSelected ? 1.34 : 0.72}
                        className="cursor-pointer transition-colors duration-200"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (usMovedRef.current) {
                            usMovedRef.current = false;
                            return;
                          }
                          zoomToUSState(stateFeature, stateCode);
                        }}
                        onMouseEnter={() => setHoveredUSStateCode(stateCode)}
                        onMouseLeave={() => setHoveredUSStateCode((current) => (current === stateCode ? null : current))}
                      >
                        <title>{stateName}</title>
                      </path>
                    );
                  })}

                  {usPins.map((pin) => (
                    <g key={pin.id} className="pointer-events-auto">
                      <circle cx={pin.x} cy={pin.y} r={5.2} fill={mapColors.pinHalo} opacity={0.8} />
                      <circle cx={pin.x} cy={pin.y} r={3.2} fill={mapColors.pin} />
                      <title>
                        {pin.label} · {pin.memoryCount} memor{pin.memoryCount === 1 ? "y" : "ies"}
                      </title>
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          </div>
        </Card>

        <Card className="h-fit bg-[linear-gradient(155deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_30%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_10%)_100%)]">
          <Input
            value={usStateQuery}
            onChange={(event) => setUSStateQuery(event.target.value)}
            placeholder="Search US states"
          />

          {selectedUSState ? (
            <div className="mt-3 rounded-2xl border border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_34%)] bg-[color-mix(in_oklab,var(--surface-3),var(--pink-bright)_12%)] p-4">
              <p className="text-sm uppercase tracking-[0.14em] text-[var(--text-muted)]">Selected state</p>
              <p className="mt-1 text-[1.25rem] font-semibold text-[var(--text-primary)]">{selectedUSState.name}</p>
              <p className="mt-1 text-base text-[var(--text-secondary)]">{selectedUSState.code}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {selectedUSStateCities.length} cit{selectedUSStateCities.length === 1 ? "y" : "ies"} saved
              </p>

              <Button className="mt-3 w-full" variant="primary" onClick={() => void toggleSelectedUSState()}>
                {selectedUSState.visited ? "Mark as unvisited" : "Mark as visited"}
              </Button>
            </div>
          ) : (
            <EmptyState
              className="mt-3 px-4 py-6"
              title="No State Selected"
              description="Click any state on the map to inspect or update your US progress."
            />
          )}

          <div className="mt-3 grid max-h-[300px] grid-cols-2 gap-2 overflow-auto pr-1">
            {filteredUSStates.map((state) => (
              <button
                key={state.code}
                type="button"
                onClick={() => setSelectedUSStateCode(state.code)}
                className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  state.visited
                    ? "border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_45%)] bg-[color-mix(in_oklab,var(--surface-3),var(--pink-bright)_16%)] text-[var(--text-primary)]"
                    : "border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-3),var(--gray-ref)_32%)] text-[var(--text-secondary)] hover:border-[var(--pink-bright)] hover:bg-[color-mix(in_oklab,var(--surface-3),var(--pink-bright)_9%)]"
                }`}
              >
                <p className="font-semibold">{state.name}</p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">{state.code}</p>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
