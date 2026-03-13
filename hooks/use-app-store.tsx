"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { isValidMonthInput } from "@/lib/utils";
import { storageAdapter } from "@/storage";
import type {
  AddMemoryEntryInput,
  AddPlaceInput,
  AppSession,
  BackupPayloadV1,
  CityRecord,
  MemoryEntryRecord,
  PhotoRecord,
  UpcomingTripRecord,
  USStateVisitRecord,
} from "@/types/models";

interface CountryGroup {
  countryCode: string;
  countryName: string;
  cities: CityRecord[];
}

interface AppStoreContextValue {
  ready: boolean;
  session: AppSession | null;
  cities: CityRecord[];
  memoryEntries: MemoryEntryRecord[];
  photos: PhotoRecord[];
  usStateVisits: USStateVisitRecord[];
  upcomingTrip: UpcomingTripRecord | null;
  photoUrls: Record<string, string>;
  visitedCountryCodes: string[];
  countryGroups: CountryGroup[];
  signIn(displayName: string): Promise<void>;
  signOut(): Promise<void>;
  addPlace(input: AddPlaceInput): Promise<void>;
  addMemoryEntry(input: AddMemoryEntryInput): Promise<void>;
  toggleUSStateVisited(input: { code: string; name: string; visited: boolean }): Promise<void>;
  saveUpcomingTrip(input: { destination: string; departureDate?: string; note?: string }): Promise<void>;
  clearUpcomingTrip(): Promise<void>;
  getCityById(cityId: string): CityRecord | undefined;
  getEntriesForCity(cityId: string): MemoryEntryRecord[];
  getPhotosForEntry(entryId: string): PhotoRecord[];
  exportBackupJson(): Promise<string>;
  importBackupFile(file: File): Promise<void>;
  refresh(): Promise<void>;
}

const AppStoreContext = createContext<AppStoreContextValue | null>(null);

function sortCities(cities: CityRecord[]) {
  return [...cities].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function sortMemoryEntries(entries: MemoryEntryRecord[]) {
  return [...entries].sort((a, b) => {
    const byVisited = b.visitedAt.localeCompare(a.visitedAt);
    if (byVisited !== 0) {
      return byVisited;
    }

    return b.createdAt.localeCompare(a.createdAt);
  });
}

function sortPhotos(photos: PhotoRecord[]) {
  return [...photos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<AppSession | null>(null);
  const [cities, setCities] = useState<CityRecord[]>([]);
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntryRecord[]>([]);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [usStateVisits, setUSStateVisits] = useState<USStateVisitRecord[]>([]);
  const [upcomingTrip, setUpcomingTrip] = useState<UpcomingTripRecord | null>(null);

  const refresh = useCallback(async () => {
    const [sessionData, snapshot] = await Promise.all([
      storageAdapter.getSession(),
      storageAdapter.getSnapshot(),
    ]);

    setSession(sessionData);
    setCities(sortCities(snapshot.cities));
    setMemoryEntries(sortMemoryEntries(snapshot.memoryEntries));
    setPhotos(sortPhotos(snapshot.photos));
    setUSStateVisits([...snapshot.usStateVisits].sort((a, b) => a.name.localeCompare(b.name)));
    setUpcomingTrip(snapshot.upcomingTrip);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      await storageAdapter.initialize();
      if (cancelled) {
        return;
      }

      await refresh();
      if (!cancelled) {
        setReady(true);
      }
    }

    setup().catch((error) => {
      console.error("Initialization failed", error);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const photoUrls = useMemo(() => {
    const nextUrls: Record<string, string> = {};

    for (const photo of photos) {
      nextUrls[photo.id] = URL.createObjectURL(photo.blob);
    }

    return nextUrls;
  }, [photos]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(photoUrls)) {
        URL.revokeObjectURL(url);
      }
    };
  }, [photoUrls]);

  const signIn = useCallback(async (displayName: string) => {
    const nextSession: AppSession = {
      isAuthenticated: true,
      displayName: displayName.trim() || "Traveler",
      signedInAt: new Date().toISOString(),
    };

    // V1 mock session; replace with Supabase auth session once backend auth is added.
    await storageAdapter.saveSession(nextSession);
    await refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await storageAdapter.saveSession(null);
    await refresh();
  }, [refresh]);

  const addPlace = useCallback(
    async (input: AddPlaceInput) => {
      if (!isValidMonthInput(input.firstMemory.visitedAt)) {
        throw new Error("Visit month must be in YYYY-MM format.");
      }

      await storageAdapter.addPlace(input);
      await refresh();
    },
    [refresh],
  );

  const addMemoryEntry = useCallback(
    async (input: AddMemoryEntryInput) => {
      if (!isValidMonthInput(input.visitedAt)) {
        throw new Error("Visit month must be in YYYY-MM format.");
      }

      await storageAdapter.addMemoryEntry(input);
      await refresh();
    },
    [refresh],
  );

  const toggleUSStateVisited = useCallback(
    async (input: { code: string; name: string; visited: boolean }) => {
      await storageAdapter.setUSStateVisited(input);
      await refresh();
    },
    [refresh],
  );

  const saveUpcomingTrip = useCallback(
    async (input: { destination: string; departureDate?: string; note?: string }) => {
      await storageAdapter.saveUpcomingTrip(input);
      await refresh();
    },
    [refresh],
  );

  const clearUpcomingTrip = useCallback(async () => {
    await storageAdapter.clearUpcomingTrip();
    await refresh();
  }, [refresh]);

  const entriesByCity = useMemo(() => {
    const map = new Map<string, MemoryEntryRecord[]>();

    for (const entry of memoryEntries) {
      const list = map.get(entry.cityId) ?? [];
      list.push(entry);
      map.set(entry.cityId, list);
    }

    return map;
  }, [memoryEntries]);

  const photosByEntry = useMemo(() => {
    const map = new Map<string, PhotoRecord[]>();

    for (const photo of photos) {
      const list = map.get(photo.entryId) ?? [];
      list.push(photo);
      map.set(photo.entryId, list);
    }

    return map;
  }, [photos]);

  const visitedCountryCodes = useMemo(() => {
    const codes = new Set(cities.map((city) => city.countryCode));
    if (usStateVisits.some((state) => state.visited)) {
      codes.add("US");
    }

    return [...codes].sort();
  }, [cities, usStateVisits]);

  const countryGroups = useMemo(() => {
    const grouped = new Map<string, CountryGroup>();

    for (const city of cities) {
      const existing = grouped.get(city.countryCode);
      if (existing) {
        existing.cities.push(city);
      } else {
        grouped.set(city.countryCode, {
          countryCode: city.countryCode,
          countryName: city.countryName,
          cities: [city],
        });
      }
    }

    return [...grouped.values()]
      .map((group) => ({
        ...group,
        cities: [...group.cities].sort((a, b) => a.cityName.localeCompare(b.cityName)),
      }))
      .sort((a, b) => a.countryName.localeCompare(b.countryName));
  }, [cities]);

  const exportBackupJson = useCallback(async () => {
    const payload = await storageAdapter.exportBackup();
    return JSON.stringify(payload, null, 2);
  }, []);

  const importBackupFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupPayloadV1;
      await storageAdapter.importBackup(parsed);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<AppStoreContextValue>(
    () => ({
      ready,
      session,
      cities,
      memoryEntries,
      photos,
      usStateVisits,
      upcomingTrip,
      photoUrls,
      visitedCountryCodes,
      countryGroups,
      signIn,
      signOut,
      addPlace,
      addMemoryEntry,
      toggleUSStateVisited,
      saveUpcomingTrip,
      clearUpcomingTrip,
      getCityById: (cityId: string) => cities.find((city) => city.id === cityId),
      getEntriesForCity: (cityId: string) => entriesByCity.get(cityId) ?? [],
      getPhotosForEntry: (entryId: string) => photosByEntry.get(entryId) ?? [],
      exportBackupJson,
      importBackupFile,
      refresh,
    }),
    [
      ready,
      session,
      cities,
      memoryEntries,
      photos,
      usStateVisits,
      upcomingTrip,
      photoUrls,
      visitedCountryCodes,
      countryGroups,
      signIn,
      signOut,
      addPlace,
      addMemoryEntry,
      toggleUSStateVisited,
      saveUpcomingTrip,
      clearUpcomingTrip,
      entriesByCity,
      photosByEntry,
      exportBackupJson,
      importBackupFile,
      refresh,
    ],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);

  if (!context) {
    throw new Error("useAppStore must be used within AppStoreProvider");
  }

  return context;
}
