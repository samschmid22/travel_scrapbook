"use client";

import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
import { ProgressChip } from "@/components/ui/progress-chip";

const MAP_WIDTH = 900;
const MAP_HEIGHT = 600;
const US_MAP_HEIGHT = 480;
const MIN_SCALE = 1;
const MAX_SCALE = 10;
const DRAG_THRESHOLD = 6;

function getThemeColor(pink: string, blue: string): string {
  if (typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "blue") {
    return blue;
  }
  return pink;
}

function getMapColors() {
  return {
    ocean: "#655d72",
    unvisited: "#6f677f",
    unvisitedHover: "#837a93",
    visited: getThemeColor("#d63b8d", "#4794ff"),
    visitedHover: getThemeColor("#ea5ca8", "#60adff"),
    selected: getThemeColor("#ff47a2", "#1f5ec5"),
    stroke: getThemeColor("#ffdef0", "#ddf0ff"),
    selectedStroke: getThemeColor("#ffdef0", "#ddf0ff"),
    worldPin: getThemeColor("#c51f73", "#1f5ec5"),
    worldPinHalo: getThemeColor("#ffdef0", "#ddf0ff"),
    usPin: getThemeColor("#ff47a2", "#4794ff"),
    usPinHalo: getThemeColor("#ffdef0", "#ddf0ff"),
  };
}

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

function zoomAroundPoint(
  current: ViewState,
  width: number,
  height: number,
  nextScaleValue: number,
  anchorX: number,
  anchorY: number,
): ViewState {
  const nextScale = clamp(nextScaleValue, MIN_SCALE, MAX_SCALE);
  if (nextScale === current.scale) {
    return current;
  }

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

function distanceBetweenPoints(first: { x: number; y: number }, second: { x: number; y: number }) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function toSvgPoint(
  event: ReactPointerEvent<SVGSVGElement>,
  width: number,
  height: number,
  clientX: number,
  clientY: number,
) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * width;
  const y = ((clientY - rect.top) / rect.height) * height;
  return { x, y };
}

function getScaledTouchDelta(
  event: ReactPointerEvent<SVGSVGElement>,
  width: number,
  height: number,
  startX: number,
  startY: number,
) {
  const rect = event.currentTarget.getBoundingClientRect();
  const scaleX = rect.width > 0 ? width / rect.width : 1;
  const scaleY = rect.height > 0 ? height / rect.height : 1;
  const rawDx = event.clientX - startX;
  const rawDy = event.clientY - startY;
  return {
    rawDx,
    rawDy,
    dx: rawDx * scaleX,
    dy: rawDy * scaleY,
  };
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

function getLargestPolygonBounds(pathGenerator: ReturnType<typeof geoPath>, feature: CountryFeature) {
  if (feature.geometry.type !== "MultiPolygon") {
    return pathGenerator.bounds(feature);
  }

  const polygons = feature.geometry.coordinates;
  if (polygons.length === 0) {
    return pathGenerator.bounds(feature);
  }

  let bestArea = -1;
  let bestBounds = pathGenerator.bounds(feature);

  for (const polygonCoordinates of polygons) {
    const polygonFeature: Feature<Polygon, CountryProperties> = {
      type: "Feature",
      id: feature.id,
      properties: feature.properties,
      geometry: {
        type: "Polygon",
        coordinates: polygonCoordinates,
      },
    };

    const area = Math.abs(pathGenerator.area(polygonFeature));
    if (area > bestArea) {
      bestArea = area;
      bestBounds = pathGenerator.bounds(polygonFeature);
    }
  }

  return bestBounds;
}

function MapLegend() {
  const mapColors = getMapColors();
  return (
    <div className="map-legend-ios-plus-one min-w-0 flex items-center gap-1.5 text-[0.58rem] leading-none font-semibold text-[var(--text-secondary)] sm:gap-3 sm:text-[0.9rem]">
      <span className="inline-flex items-center gap-0.5 whitespace-nowrap sm:gap-1.5">
        <span className="h-2 w-2 rounded-full sm:h-3 sm:w-3" style={{ background: mapColors.unvisited }} />
        Unvisited
      </span>
      <span className="inline-flex items-center gap-0.5 whitespace-nowrap sm:gap-1.5">
        <span className="h-2 w-2 rounded-full sm:h-3 sm:w-3" style={{ background: mapColors.visited }} />
        Visited
      </span>
      <span className="inline-flex items-center gap-0.5 whitespace-nowrap sm:gap-1.5">
        <span className="h-2 w-2 rounded-full sm:h-3 sm:w-3" style={{ background: mapColors.selected }} />
        Selected
      </span>
    </div>
  );
}

export function MapExplorer() {
  const { cities, countryGroups, getEntriesForCity, usStateVisits, toggleUSStateVisited, visitedCountryCodes } = useAppStore();
  const [, setThemeTick] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => setThemeTick((n) => n + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  const mapColors = getMapColors();
  const [selectedCountry, setSelectedCountry] = useState<{ code?: string; name: string } | null>(null);
  const [hoveredCountryName, setHoveredCountryName] = useState<string | null>(null);
  const [hoveredUSStateCode, setHoveredUSStateCode] = useState<string | null>(null);
  const [selectedUSStateCode, setSelectedUSStateCode] = useState<string | null>(null);
  const [usStateQuery, setUSStateQuery] = useState("");
  const [worldViewState, setWorldViewState] = useState<ViewState>({ scale: 1, tx: 0, ty: 0 });
  const [usViewState, setUSViewState] = useState<ViewState>({ scale: 1, tx: 0, ty: 0 });
  const [worldTransformAnimated, setWorldTransformAnimated] = useState(true);
  const [usTransformAnimated, setUSTransformAnimated] = useState(true);

  const worldViewStateRef = useRef<ViewState>({ scale: 1, tx: 0, ty: 0 });
  const usViewStateRef = useRef<ViewState>({ scale: 1, tx: 0, ty: 0 });
  const worldPendingViewRef = useRef<ViewState | null>(null);
  const usPendingViewRef = useRef<ViewState | null>(null);
  const worldRafRef = useRef<number | null>(null);
  const usRafRef = useRef<number | null>(null);

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
  const worldTouchPointsRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const usTouchPointsRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const worldPinchRef = useRef<{ startDistance: number; startViewState: ViewState } | null>(null);
  const usPinchRef = useRef<{ startDistance: number; startViewState: ViewState } | null>(null);

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

  const usFeatureByCode = useMemo(() => {
    const map = new Map<string, USStateFeature>();
    for (const stateFeature of usStateFeatures) {
      const fips = getFipsFromFeatureId(stateFeature.id);
      if (!fips) {
        continue;
      }

      const stateCode = usFipsToStateCode[fips];
      if (stateCode) {
        map.set(stateCode, stateFeature);
      }
    }

    return map;
  }, [usStateFeatures]);

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
        label: city.cityName,
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
        label: city.cityName,
        x,
        y,
        memoryCount,
      });
    }

    return applyPinOffsets(pins);
  }, [getEntriesForCity, selectedUSStateCities, selectedUSStateCode, usProjection]);

  useEffect(() => {
    return () => {
      if (worldRafRef.current !== null) {
        cancelAnimationFrame(worldRafRef.current);
      }
      if (usRafRef.current !== null) {
        cancelAnimationFrame(usRafRef.current);
      }
    };
  }, []);

  function clearWorldFrame() {
    if (worldRafRef.current !== null) {
      cancelAnimationFrame(worldRafRef.current);
      worldRafRef.current = null;
    }
    worldPendingViewRef.current = null;
  }

  function clearUSFrame() {
    if (usRafRef.current !== null) {
      cancelAnimationFrame(usRafRef.current);
      usRafRef.current = null;
    }
    usPendingViewRef.current = null;
  }

  function applyWorldView(next: ViewState, options?: { animate?: boolean; schedule?: boolean }) {
    const animate = options?.animate ?? false;
    const schedule = options?.schedule ?? false;
    setWorldTransformAnimated(animate);
    worldViewStateRef.current = next;

    if (!schedule) {
      clearWorldFrame();
      setWorldViewState(next);
      return;
    }

    worldPendingViewRef.current = next;
    if (worldRafRef.current !== null) {
      return;
    }

    worldRafRef.current = requestAnimationFrame(() => {
      worldRafRef.current = null;
      const queued = worldPendingViewRef.current;
      if (!queued) {
        return;
      }
      worldPendingViewRef.current = null;
      setWorldViewState(queued);
    });
  }

  function applyUSView(next: ViewState, options?: { animate?: boolean; schedule?: boolean }) {
    const animate = options?.animate ?? false;
    const schedule = options?.schedule ?? false;
    setUSTransformAnimated(animate);
    usViewStateRef.current = next;

    if (!schedule) {
      clearUSFrame();
      setUSViewState(next);
      return;
    }

    usPendingViewRef.current = next;
    if (usRafRef.current !== null) {
      return;
    }

    usRafRef.current = requestAnimationFrame(() => {
      usRafRef.current = null;
      const queued = usPendingViewRef.current;
      if (!queued) {
        return;
      }
      usPendingViewRef.current = null;
      setUSViewState(queued);
    });
  }

  function resetWorldView() {
    setSelectedCountry(null);
    applyWorldView({ scale: 1, tx: 0, ty: 0 }, { animate: true });
    worldTouchPointsRef.current.clear();
    worldPinchRef.current = null;
    worldDragRef.current = null;
    worldMovedRef.current = false;
  }

  function resetUSView() {
    setSelectedUSStateCode(null);
    applyUSView({ scale: 1, tx: 0, ty: 0 }, { animate: true });
    usTouchPointsRef.current.clear();
    usPinchRef.current = null;
    usDragRef.current = null;
    usMovedRef.current = false;
  }

  function zoomWorldAt(nextScaleValue: number) {
    const next = zoomAroundCenter(worldViewStateRef.current, MAP_WIDTH, MAP_HEIGHT, nextScaleValue);
    applyWorldView(next, { animate: true });
  }

  function zoomUSAt(nextScaleValue: number) {
    const next = zoomAroundCenter(usViewStateRef.current, MAP_WIDTH, US_MAP_HEIGHT, nextScaleValue);
    applyUSView(next, { animate: true });
  }

  function zoomToCountry(countryFeature: CountryFeature, nextSelection: { code?: string; name: string }) {
    const bounds = getLargestPolygonBounds(worldPathGenerator, countryFeature);
    const [[x0, y0], [x1, y1]] = bounds;
    const dx = x1 - x0;
    const dy = y1 - y0;

    if (dx <= 0 || dy <= 0 || Number.isNaN(dx) || Number.isNaN(dy)) {
      setSelectedCountry(nextSelection);
      return;
    }

    const centerX = (x0 + x1) / 2;
    const centerY = (y0 + y1) / 2;
    const minDimension = Math.min(dx, dy);
    const padding = clamp(minDimension * 0.22, 28, 78);
    const rawScale = Math.min((MAP_WIDTH - padding * 2) / dx, (MAP_HEIGHT - padding * 2) / dy);
    const scale = clamp(rawScale, 1.7, MAX_SCALE);

    setSelectedCountry(nextSelection);
    applyWorldView(
      clampViewState(
        {
          scale,
          tx: MAP_WIDTH / 2 - scale * centerX,
          ty: MAP_HEIGHT / 2 - scale * centerY,
        },
        MAP_WIDTH,
        MAP_HEIGHT,
      ),
      { animate: true },
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
    const minDimension = Math.min(dx, dy);
    const padding = clamp(minDimension * 0.24, 22, 66);
    const rawScale = Math.min((MAP_WIDTH - padding * 2) / dx, (US_MAP_HEIGHT - padding * 2) / dy);
    const scale = clamp(rawScale, 1.7, 7.5);

    setSelectedUSStateCode(stateCode);
    applyUSView(
      clampViewState(
        {
          scale,
          tx: MAP_WIDTH / 2 - scale * centerX,
          ty: US_MAP_HEIGHT / 2 - scale * centerY,
        },
        MAP_WIDTH,
        US_MAP_HEIGHT,
      ),
      { animate: true },
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
    if (event.pointerType === "touch") {
      const point = toSvgPoint(event, MAP_WIDTH, MAP_HEIGHT, event.clientX, event.clientY);
      worldTouchPointsRef.current.set(event.pointerId, point);
      event.currentTarget.setPointerCapture(event.pointerId);

      if (worldTouchPointsRef.current.size >= 2) {
        setWorldTransformAnimated(false);
        const [firstPoint, secondPoint] = Array.from(worldTouchPointsRef.current.values());
        worldPinchRef.current = {
          startDistance: Math.max(distanceBetweenPoints(firstPoint, secondPoint), 1),
          startViewState: worldViewStateRef.current,
        };
        worldDragRef.current = null;
        worldMovedRef.current = true;
        return;
      }

      if (worldViewStateRef.current.scale <= 1) {
        return;
      }

      worldMovedRef.current = false;
      setWorldTransformAnimated(false);
      worldDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startTx: worldViewStateRef.current.tx,
        startTy: worldViewStateRef.current.ty,
      };
      return;
    }

    if (worldViewStateRef.current.scale <= 1) {
      return;
    }

    worldMovedRef.current = false;
    setWorldTransformAnimated(false);
    worldDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTx: worldViewStateRef.current.tx,
      startTy: worldViewStateRef.current.ty,
    };
  }

  function handleWorldPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerType === "touch") {
      if (!worldTouchPointsRef.current.has(event.pointerId)) {
        return;
      }

      const point = toSvgPoint(event, MAP_WIDTH, MAP_HEIGHT, event.clientX, event.clientY);
      worldTouchPointsRef.current.set(event.pointerId, point);
      const points = Array.from(worldTouchPointsRef.current.values());

      if (points.length >= 2) {
        const [firstPoint, secondPoint] = points;
        const distance = Math.max(distanceBetweenPoints(firstPoint, secondPoint), 1);
        if (!worldPinchRef.current) {
          worldPinchRef.current = {
            startDistance: distance,
            startViewState: worldViewStateRef.current,
          };
        }

        const pinchState = worldPinchRef.current;
        if (!pinchState) {
          return;
        }

        const midpointX = (firstPoint.x + secondPoint.x) / 2;
        const midpointY = (firstPoint.y + secondPoint.y) / 2;
        const nextScale = pinchState.startViewState.scale * (distance / pinchState.startDistance);
        applyWorldView(
          zoomAroundPoint(pinchState.startViewState, MAP_WIDTH, MAP_HEIGHT, nextScale, midpointX, midpointY),
          { schedule: true },
        );
        worldMovedRef.current = true;
        return;
      }

      if (worldViewStateRef.current.scale <= 1) {
        return;
      }

      const drag = worldDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        worldDragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startTx: worldViewStateRef.current.tx,
          startTy: worldViewStateRef.current.ty,
        };
        return;
      }

      const { rawDx, rawDy, dx, dy } = getScaledTouchDelta(event, MAP_WIDTH, MAP_HEIGHT, drag.startX, drag.startY);

      if (Math.abs(rawDx) > DRAG_THRESHOLD || Math.abs(rawDy) > DRAG_THRESHOLD) {
        worldMovedRef.current = true;
      }

      applyWorldView(
        clampViewState(
          {
            scale: worldViewStateRef.current.scale,
            tx: drag.startTx + dx,
            ty: drag.startTy + dy,
          },
          MAP_WIDTH,
          MAP_HEIGHT,
        ),
        { schedule: true },
      );
      return;
    }

    const drag = worldDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      if (!worldMovedRef.current) {
        // Capture only after drag intent is clear so click-to-select still works while zoomed.
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      worldMovedRef.current = true;
    }

    applyWorldView(
      clampViewState(
        {
          scale: worldViewStateRef.current.scale,
          tx: drag.startTx + dx,
          ty: drag.startTy + dy,
        },
        MAP_WIDTH,
        MAP_HEIGHT,
      ),
      { schedule: true },
    );
  }

  function handleWorldPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerType === "touch") {
      const hadPinch = Boolean(worldPinchRef.current);
      worldTouchPointsRef.current.delete(event.pointerId);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (worldDragRef.current?.pointerId === event.pointerId) {
        worldDragRef.current = null;
      }

      if (worldTouchPointsRef.current.size < 2) {
        worldPinchRef.current = null;
      }

      if (worldTouchPointsRef.current.size === 0 && hadPinch) {
        worldMovedRef.current = false;
      }

      return;
    }

    const drag = worldDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    worldDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!worldMovedRef.current) {
      worldMovedRef.current = false;
    }
  }

  function handleUSPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerType === "touch") {
      const point = toSvgPoint(event, MAP_WIDTH, US_MAP_HEIGHT, event.clientX, event.clientY);
      usTouchPointsRef.current.set(event.pointerId, point);
      event.currentTarget.setPointerCapture(event.pointerId);

      if (usTouchPointsRef.current.size >= 2) {
        setUSTransformAnimated(false);
        const [firstPoint, secondPoint] = Array.from(usTouchPointsRef.current.values());
        usPinchRef.current = {
          startDistance: Math.max(distanceBetweenPoints(firstPoint, secondPoint), 1),
          startViewState: usViewStateRef.current,
        };
        usDragRef.current = null;
        usMovedRef.current = true;
        return;
      }

      if (usViewStateRef.current.scale <= 1) {
        return;
      }

      usMovedRef.current = false;
      setUSTransformAnimated(false);
      usDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startTx: usViewStateRef.current.tx,
        startTy: usViewStateRef.current.ty,
      };
      return;
    }

    if (usViewStateRef.current.scale <= 1) {
      return;
    }

    usMovedRef.current = false;
    setUSTransformAnimated(false);
    usDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTx: usViewStateRef.current.tx,
      startTy: usViewStateRef.current.ty,
    };
  }

  function handleUSPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerType === "touch") {
      if (!usTouchPointsRef.current.has(event.pointerId)) {
        return;
      }

      const point = toSvgPoint(event, MAP_WIDTH, US_MAP_HEIGHT, event.clientX, event.clientY);
      usTouchPointsRef.current.set(event.pointerId, point);
      const points = Array.from(usTouchPointsRef.current.values());

      if (points.length >= 2) {
        const [firstPoint, secondPoint] = points;
        const distance = Math.max(distanceBetweenPoints(firstPoint, secondPoint), 1);
        if (!usPinchRef.current) {
          usPinchRef.current = {
            startDistance: distance,
            startViewState: usViewStateRef.current,
          };
        }

        const pinchState = usPinchRef.current;
        if (!pinchState) {
          return;
        }

        const midpointX = (firstPoint.x + secondPoint.x) / 2;
        const midpointY = (firstPoint.y + secondPoint.y) / 2;
        const nextScale = pinchState.startViewState.scale * (distance / pinchState.startDistance);
        applyUSView(zoomAroundPoint(pinchState.startViewState, MAP_WIDTH, US_MAP_HEIGHT, nextScale, midpointX, midpointY), {
          schedule: true,
        });
        usMovedRef.current = true;
        return;
      }

      if (usViewStateRef.current.scale <= 1) {
        return;
      }

      const drag = usDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        usDragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startTx: usViewStateRef.current.tx,
          startTy: usViewStateRef.current.ty,
        };
        return;
      }

      const { rawDx, rawDy, dx, dy } = getScaledTouchDelta(
        event,
        MAP_WIDTH,
        US_MAP_HEIGHT,
        drag.startX,
        drag.startY,
      );

      if (Math.abs(rawDx) > DRAG_THRESHOLD || Math.abs(rawDy) > DRAG_THRESHOLD) {
        usMovedRef.current = true;
      }

      applyUSView(
        clampViewState(
          {
            scale: usViewStateRef.current.scale,
            tx: drag.startTx + dx,
            ty: drag.startTy + dy,
          },
          MAP_WIDTH,
          US_MAP_HEIGHT,
        ),
        { schedule: true },
      );
      return;
    }

    const drag = usDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      if (!usMovedRef.current) {
        // Capture only after drag intent is clear so click-to-select still works while zoomed.
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      usMovedRef.current = true;
    }

    applyUSView(
      clampViewState(
        {
          scale: usViewStateRef.current.scale,
          tx: drag.startTx + dx,
          ty: drag.startTy + dy,
        },
        MAP_WIDTH,
        US_MAP_HEIGHT,
      ),
      { schedule: true },
    );
  }

  function handleUSPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerType === "touch") {
      const hadPinch = Boolean(usPinchRef.current);
      usTouchPointsRef.current.delete(event.pointerId);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (usDragRef.current?.pointerId === event.pointerId) {
        usDragRef.current = null;
      }

      if (usTouchPointsRef.current.size < 2) {
        usPinchRef.current = null;
      }

      if (usTouchPointsRef.current.size === 0 && hadPinch) {
        usMovedRef.current = false;
      }

      return;
    }

    const drag = usDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    usDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!usMovedRef.current) {
      usMovedRef.current = false;
    }
  }

  const selectedCountryMemoryCount = selectedCountryGroup
    ? selectedCountryGroup.cities.reduce((count, city) => count + getEntriesForCity(city.id).length, 0)
    : 0;
  const totalWorldCountries = worldFeatures.length;

  return (
    <div className="space-y-3.5 sm:space-y-5">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="bg-[linear-gradient(140deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_30%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_14%)_100%)] p-3 sm:p-[var(--space-panel)]">
          <p className="min-h-[1.35rem] text-[0.58rem] leading-[1.05] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] sm:min-h-0 sm:text-[0.74rem] sm:tracking-[0.1em] lg:text-[0.84rem]">
            <span className="sm:hidden">
              Visited
              <br />
              Continents
            </span>
            <span className="hidden sm:inline">Visited Continents</span>
          </p>
          <p className="mt-1.5 text-[1.24rem] leading-[1.06] font-semibold tracking-[-0.01em] text-[var(--text-primary)] sm:mt-2.5 sm:text-[clamp(2rem,2.2vw,2.5rem)]">
            {stats.continents}
          </p>
        </Card>
        <Card className="bg-[linear-gradient(145deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_28%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_10%)_100%)] p-3 sm:p-[var(--space-panel)]">
          <p className="min-h-[1.35rem] text-[0.58rem] leading-[1.05] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] sm:min-h-0 sm:text-[0.74rem] sm:tracking-[0.1em] lg:text-[0.84rem]">
            <span className="sm:hidden">
              Visited
              <br />
              Countries
            </span>
            <span className="hidden sm:inline">Visited Countries</span>
          </p>
          <p className="mt-1.5 text-[1.24rem] leading-[1.06] font-semibold tracking-[-0.01em] text-[var(--text-primary)] sm:mt-2.5 sm:text-[clamp(2rem,2.2vw,2.5rem)]">
            {stats.countries}
          </p>
        </Card>
        <Card className="bg-[linear-gradient(140deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_28%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_15%)_100%)] p-3 sm:p-[var(--space-panel)]">
          <p className="min-h-[1.35rem] text-[0.58rem] leading-[1.05] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] sm:min-h-0 sm:text-[0.74rem] sm:tracking-[0.1em] lg:text-[0.84rem]">
            <span className="sm:hidden">
              Visited
              <br />
              Cities
            </span>
            <span className="hidden sm:inline">Visited Cities</span>
          </p>
          <p className="mt-1.5 text-[1.24rem] leading-[1.06] font-semibold tracking-[-0.01em] text-[var(--text-primary)] sm:mt-2.5 sm:text-[clamp(2rem,2.2vw,2.5rem)]">
            {stats.cities}
          </p>
        </Card>
      </div>

      <div className="grid gap-3.5 sm:gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[var(--border-soft)] px-4 py-3.5 sm:px-6 sm:py-5">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <h3 className="ds-section-title text-[1.1rem] sm:text-[1.28rem] lg:!text-[1.6rem] xl:!text-[1.75rem]">
                World Map
              </h3>
              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="ds-map-zoom-btn h-9 w-9 rounded-lg px-0 text-[0.82rem] sm:h-10 sm:w-auto sm:rounded-[var(--radius-control)] sm:px-3.5 sm:text-sm"
                  onClick={() => zoomWorldAt(worldViewState.scale * 1.25)}
                >
                  <Plus className="h-[18px] w-[18px] sm:h-4 sm:w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="ds-map-zoom-btn h-9 w-9 rounded-lg px-0 text-[0.82rem] sm:h-10 sm:w-auto sm:rounded-[var(--radius-control)] sm:px-3.5 sm:text-sm"
                  onClick={() => zoomWorldAt(worldViewState.scale / 1.25)}
                >
                  <Minus className="h-[18px] w-[18px] sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 rounded-lg px-2 text-[0.72rem] sm:h-10 sm:rounded-[var(--radius-control)] sm:px-3.5 sm:text-sm"
                  onClick={resetWorldView}
                  disabled={worldViewState.scale <= 1 && !selectedCountry}
                >
                  <span className="sm:hidden">Reset</span>
                  <span className="hidden sm:inline">Reset View</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 p-3 sm:space-y-3 sm:p-4 lg:p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 sm:gap-3">
              <MapLegend />
              <ProgressChip className="shrink-0 whitespace-nowrap px-2 text-[0.58rem] sm:text-[0.8rem]">
                <span className="sm:hidden">{stats.countries}/{totalWorldCountries}</span>
                <span className="hidden sm:inline">
                  {stats.countries} / {totalWorldCountries} Countries Visited
                </span>
              </ProgressChip>
            </div>

            <div className="relative rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-3),var(--gray-ref)_30%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_16%)_100%)] p-1 sm:p-2.5">
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
                    transition: worldTransformAnimated ? "transform 240ms ease-out" : "none",
                    willChange: "transform",
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
                        strokeWidth={isSelected ? 1.36 : 0.68}
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
                      <circle cx={pin.x} cy={pin.y} r={3.2} fill={mapColors.worldPinHalo} opacity={0.28} />
                      <circle
                        cx={pin.x}
                        cy={pin.y}
                        r={2.95}
                        fill="none"
                        stroke={mapColors.worldPinHalo}
                        strokeWidth={0.8}
                      />
                      <circle cx={pin.x} cy={pin.y} r={1.85} fill={mapColors.worldPin} />
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
              className="[&>h3]:!text-[var(--pink-dark)] [&>h3]:font-semibold [&>p]:!text-[var(--pink-dark)] [&>p]:font-medium"
              title="No Country Selected"
              description="Select a country on the map to inspect saved cities and memory activity there."
            />
          ) : (
            <div className="space-y-4">
              <div>
                <p className="ds-eyebrow">Selected Country</p>
                <h3 className="ds-section-title mt-1.5">{selectedCountry.name}</h3>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <Badge variant="muted">{selectedCountryGroup?.cities.length ?? 0} Cities</Badge>
                  <Badge variant="muted">{selectedCountryMemoryCount} Memories</Badge>
                </div>
              </div>

              {selectedCountryGroup ? (
                <div className="space-y-2">
                  {selectedCountryGroup.cities.map((city) => {
                    const entries = getEntriesForCity(city.id);
                    const latestEntry = entries[0];

                    return (
                      <Link
                        key={city.id}
                        href={`/places/${city.id}`}
                        className="block rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-3),var(--gray-ref)_26%)] px-3.5 py-2.5 transition hover:border-[var(--pink-bright)] hover:bg-[color-mix(in_oklab,var(--surface-3),var(--pink-bright)_18%)]"
                      >
                        <p className="ds-card-title">{city.cityName}</p>
                        <p className="ds-meta mt-1">
                          {entries.length} memories
                          {latestEntry ? ` • Last ${toMonthLabel(latestEntry.visitedAt)}` : ""}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  className="px-4 py-6 [&>h3]:!text-[var(--pink-dark)] [&>h3]:font-semibold [&>p]:!text-[var(--pink-dark)] [&>p]:font-medium"
                  title="No Places Saved Yet"
                  description="You have not added any cities in this country yet."
                />
              )}

              {selectedCountry.code === "US" ? (
                <div className="rounded-[var(--radius-card)] border border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_30%)] bg-[color-mix(in_oklab,var(--surface-3),var(--pink-bright)_12%)] p-3.5">
                  <p className="ds-eyebrow">United States Progress</p>
                  <div className="mt-2">
                    <ProgressChip>
                      {visitedUSStateCount} / {usStateVisits.length || 50} States Visited
                    </ProgressChip>
                  </div>
                  <a
                    href="#us-states-map"
                    className="mt-3 inline-flex text-[0.96rem] font-semibold text-[var(--accent-800)] transition hover:text-[var(--text-primary)]"
                  >
                    Open United States Map
                  </a>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </div>

      <div id="us-states-map" className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[var(--border-soft)] px-4 py-3.5 sm:px-6 sm:py-5">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <h3 className="ds-section-title text-[1.1rem] sm:text-[1.28rem] lg:!text-[1.6rem] xl:!text-[1.75rem]">
                United States Map
              </h3>
              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="ds-map-zoom-btn h-9 w-9 rounded-lg px-0 text-[0.82rem] sm:h-10 sm:w-auto sm:rounded-[var(--radius-control)] sm:px-3.5 sm:text-sm"
                  onClick={() => zoomUSAt(usViewState.scale * 1.25)}
                >
                  <Plus className="h-[18px] w-[18px] sm:h-4 sm:w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="ds-map-zoom-btn h-9 w-9 rounded-lg px-0 text-[0.82rem] sm:h-10 sm:w-auto sm:rounded-[var(--radius-control)] sm:px-3.5 sm:text-sm"
                  onClick={() => zoomUSAt(usViewState.scale / 1.25)}
                >
                  <Minus className="h-[18px] w-[18px] sm:h-4 sm:w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 rounded-lg px-2 text-[0.72rem] sm:h-10 sm:rounded-[var(--radius-control)] sm:px-3.5 sm:text-sm"
                  onClick={resetUSView}
                  disabled={usViewState.scale <= 1 && !selectedUSStateCode}
                >
                  <span className="sm:hidden">Reset</span>
                  <span className="hidden sm:inline">Reset View</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 p-3 sm:space-y-3 sm:p-4 lg:p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 sm:gap-3">
              <MapLegend />
              <ProgressChip className="shrink-0 whitespace-nowrap px-2 text-[0.58rem] sm:text-[0.8rem]">
                <span className="sm:hidden">{visitedUSStateCount}/{usStateVisits.length || 50}</span>
                <span className="hidden sm:inline">
                  {visitedUSStateCount} / {usStateVisits.length || 50} States Visited
                </span>
              </ProgressChip>
            </div>

            <div className="rounded-[var(--radius-card)] border border-[var(--border-soft)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface-3),var(--gray-ref)_30%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_14%)_100%)] p-1 sm:p-2.5">
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
                    transition: usTransformAnimated ? "transform 240ms ease-out" : "none",
                    willChange: "transform",
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
                        strokeWidth={isSelected ? 1.36 : 0.72}
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
                      <circle cx={pin.x} cy={pin.y} r={3.2} fill={mapColors.usPinHalo} opacity={0.28} />
                      <circle cx={pin.x} cy={pin.y} r={2.95} fill="none" stroke={mapColors.usPinHalo} strokeWidth={0.8} />
                      <circle cx={pin.x} cy={pin.y} r={1.85} fill={mapColors.usPin} />
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
          <p className="ds-input-label mb-2">Search States</p>
          <Input
            value={usStateQuery}
            onChange={(event) => setUSStateQuery(event.target.value)}
            placeholder="Search US states"
          />

          {selectedUSState ? (
            <div className="mt-3 rounded-[var(--radius-card)] border border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_34%)] bg-[color-mix(in_oklab,var(--surface-3),var(--pink-bright)_12%)] p-4">
              <p className="ds-eyebrow">Selected State</p>
              <p className="ds-section-title mt-1">{selectedUSState.name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="muted">{selectedUSState.code}</Badge>
                <Badge variant="muted">
                  {selectedUSStateCities.length} Cit{selectedUSStateCities.length === 1 ? "y" : "ies"}
                </Badge>
              </div>

              <Button className="mt-3 w-full" variant="primary" onClick={() => void toggleSelectedUSState()}>
                {selectedUSState.visited ? "Mark as Unvisited" : "Mark as Visited"}
              </Button>
            </div>
          ) : (
            <EmptyState
              className="mt-3 px-4 py-6 [&>h3]:!text-[var(--pink-dark)] [&>h3]:font-semibold [&>p]:!text-[var(--pink-dark)] [&>p]:font-medium"
              title="No State Selected"
              description="Click any state on the map to inspect or update your US progress."
            />
          )}

          <div className="mt-3 grid max-h-[308px] grid-cols-2 gap-2 overflow-auto pr-1">
            {filteredUSStates.map((state) => (
              <button
                key={state.code}
                type="button"
                onClick={() => {
                  const stateFeature = usFeatureByCode.get(state.code);
                  if (stateFeature) {
                    zoomToUSState(stateFeature, state.code);
                  } else {
                    setSelectedUSStateCode(state.code);
                  }
                }}
                className={`rounded-[var(--radius-control)] border px-3 py-2.5 text-left text-sm transition ${
                  state.code === selectedUSStateCode
                    ? "border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_45%)] bg-[color-mix(in_oklab,var(--surface-3),var(--pink-bright)_16%)] text-[var(--text-primary)]"
                    : "border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-3),var(--gray-ref)_32%)] text-[var(--text-secondary)] hover:border-[var(--pink-bright)] hover:bg-[color-mix(in_oklab,var(--surface-3),var(--pink-bright)_9%)]"
                }`}
              >
                <p className="font-semibold leading-tight">{state.name}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{state.code}</p>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
