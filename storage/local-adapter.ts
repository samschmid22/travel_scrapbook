"use client";

import Dexie, { type Table } from "dexie";

import { getUSStateCodeFromRegion, usStates } from "@/data/us-states";
import { normalizeText, createId } from "@/lib/utils";
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
import type { StorageAdapter, StorageSnapshot } from "@/storage/adapter";

const SESSION_KEY = "current";
const META_SEEDED_KEY = "seeded-v1";
const UPCOMING_TRIP_KEY = "primary";

interface SessionRow {
  key: string;
  value: AppSession;
}

interface MetaRow {
  key: string;
  value: string;
}

class BeenThereDatabase extends Dexie {
  session!: Table<SessionRow, string>;
  meta!: Table<MetaRow, string>;
  cities!: Table<CityRecord, string>;
  memoryEntries!: Table<MemoryEntryRecord, string>;
  photos!: Table<PhotoRecord, string>;
  usStateVisits!: Table<USStateVisitRecord, string>;
  upcomingTrip!: Table<UpcomingTripRecord, string>;

  constructor() {
    super("been-there-v1");

    this.version(1).stores({
      session: "&key",
      meta: "&key",
      cities: "&id,countryCode,countryName,cityName,updatedAt",
      memoryEntries: "&id,cityId,visitedAt,createdAt",
      photos: "&id,cityId,entryId,createdAt",
    });

    this.version(2)
      .stores({
        session: "&key",
        meta: "&key",
        cities: "&id,countryCode,countryName,cityName,updatedAt",
        memoryEntries: "&id,cityId,visitedAt,createdAt",
        photos: "&id,cityId,entryId,createdAt",
        usStateVisits: "&code,visited,updatedAt",
      })
      .upgrade(async (tx) => {
        const cities = await tx.table<CityRecord, string>("cities").toArray();
        const stateRows = normalizeUSStateVisits(undefined, cities, nowIso());
        if (stateRows.length > 0) {
          await tx.table<USStateVisitRecord, string>("usStateVisits").bulkPut(stateRows);
        }
      });

    this.version(3).stores({
      session: "&key",
      meta: "&key",
      cities: "&id,countryCode,countryName,cityName,updatedAt",
      memoryEntries: "&id,cityId,visitedAt,createdAt",
      photos: "&id,cityId,entryId,createdAt",
      usStateVisits: "&code,visited,updatedAt",
      upcomingTrip: "&key,updatedAt",
    });
  }
}

const db = new BeenThereDatabase();

function nowIso() {
  return new Date().toISOString();
}

function blankToUndefined(value?: string) {
  if (!value?.trim()) {
    return undefined;
  }

  return value.trim();
}

function toBlob(file: File) {
  return file;
}

async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to convert blob to data URL."));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}

function deriveUSVisitedCodesFromCities(cities: CityRecord[]) {
  const visited = new Set<string>();

  for (const city of cities) {
    if (city.countryCode !== "US") {
      continue;
    }

    const stateCode = getUSStateCodeFromRegion(city.region);
    if (stateCode) {
      visited.add(stateCode);
    }
  }

  return visited;
}

function normalizeUSStateVisits(
  existingRows: USStateVisitRecord[] | undefined,
  cities: CityRecord[],
  timestamp: string,
) {
  const existingMap = new Map((existingRows ?? []).map((row) => [row.code.toUpperCase(), row]));
  const visitedByCities = deriveUSVisitedCodesFromCities(cities);

  return usStates.map((state) => {
    const existing = existingMap.get(state.code);
    const visitedFromExisting = existing?.visited ?? false;
    return {
      code: state.code,
      name: state.name,
      visited: visitedFromExisting || visitedByCities.has(state.code),
      updatedAt: existing?.updatedAt ?? timestamp,
    };
  });
}

export class LocalDexieAdapter implements StorageAdapter {
  private async ensureUSStateVisitsRows() {
    const [cities, existingRows] = await Promise.all([db.cities.toArray(), db.usStateVisits.toArray()]);
    const normalizedRows = normalizeUSStateVisits(existingRows, cities, nowIso());

    if (normalizedRows.length > 0) {
      await db.usStateVisits.bulkPut(normalizedRows);
    }
  }

  private async maybeMarkUSStateVisited(countryCode: string, region?: string) {
    if (countryCode !== "US") {
      return;
    }

    const stateCode = getUSStateCodeFromRegion(region);
    if (!stateCode) {
      return;
    }

    const state = usStates.find((entry) => entry.code === stateCode);
    if (!state) {
      return;
    }

    await this.setUSStateVisited({
      code: state.code,
      name: state.name,
      visited: true,
    });
  }

  async initialize() {
    const alreadySeeded = await db.meta.get(META_SEEDED_KEY);
    if (alreadySeeded?.value === "true") {
      await this.ensureUSStateVisitsRows();
      return;
    }

    const cityCount = await db.cities.count();
    if (cityCount > 0) {
      await db.meta.put({ key: META_SEEDED_KEY, value: "true" });
      await this.ensureUSStateVisitsRows();
      return;
    }

    const currentDate = nowIso();
    const phoenixCityId = createId();
    const firstEntryId = createId();

    await db.transaction("rw", db.cities, db.memoryEntries, db.meta, db.usStateVisits, async () => {
      await db.cities.put({
        id: phoenixCityId,
        countryCode: "US",
        countryName: "United States",
        cityName: "Phoenix",
        region: "Arizona",
        latitude: 33.4484,
        longitude: -112.074,
        createdAt: currentDate,
        updatedAt: currentDate,
      });

      await db.memoryEntries.put({
        id: firstEntryId,
        cityId: phoenixCityId,
        visitedAt: "2024-10",
        description: "First memory saved in Been There.",
        photoIds: [],
        createdAt: currentDate,
      });

      await db.meta.put({ key: META_SEEDED_KEY, value: "true" });

      const stateRows = normalizeUSStateVisits(
        undefined,
        [
          {
            id: phoenixCityId,
            countryCode: "US",
            countryName: "United States",
            cityName: "Phoenix",
            region: "Arizona",
            latitude: 33.4484,
            longitude: -112.074,
            createdAt: currentDate,
            updatedAt: currentDate,
          },
        ],
        currentDate,
      );
      if (stateRows.length > 0) {
        await db.usStateVisits.bulkPut(stateRows);
      }
    });
  }

  async getSession() {
    const session = await db.session.get(SESSION_KEY);
    return session?.value ?? null;
  }

  async saveSession(session: AppSession | null) {
    if (!session) {
      await db.session.delete(SESSION_KEY);
      return;
    }

    await db.session.put({ key: SESSION_KEY, value: session });
  }

  async getSnapshot(): Promise<StorageSnapshot> {
    const [cities, memoryEntries, photos, usStateVisits, upcomingTrip] = await Promise.all([
      db.cities.toArray(),
      db.memoryEntries.toArray(),
      db.photos.toArray(),
      db.usStateVisits.toArray(),
      db.upcomingTrip.get(UPCOMING_TRIP_KEY),
    ]);

    return {
      cities,
      memoryEntries,
      photos,
      usStateVisits,
      upcomingTrip: upcomingTrip ?? null,
    };
  }

  async addPlace(input: AddPlaceInput) {
    const currentDate = nowIso();
    const normalizedCityName = normalizeText(input.cityName);
    const normalizedRegion = normalizeText(input.region ?? "");

    const cityMatches = await db.cities.where("countryCode").equals(input.countryCode).toArray();
    const existingCity = cityMatches.find((city) => {
      return (
        normalizeText(city.cityName) === normalizedCityName &&
        normalizeText(city.region ?? "") === normalizedRegion
      );
    });

    if (existingCity) {
      if (
        (input.latitude !== undefined || input.longitude !== undefined) &&
        (existingCity.latitude === undefined || existingCity.longitude === undefined)
      ) {
        await db.cities.update(existingCity.id, {
          latitude: input.latitude ?? existingCity.latitude,
          longitude: input.longitude ?? existingCity.longitude,
          updatedAt: currentDate,
        });
      }

      const entry = await this.addMemoryEntry({
        cityId: existingCity.id,
        visitedAt: input.firstMemory.visitedAt,
        description: input.firstMemory.description,
        files: input.firstMemory.files,
      });

      await this.maybeMarkUSStateVisited(existingCity.countryCode, existingCity.region ?? input.region);

      return {
        city: existingCity,
        entry,
      };
    }

    const cityId = createId();
    const entryId = createId();
    const photoIds: string[] = [];
    const files = input.firstMemory.files ?? [];

    await db.transaction("rw", db.cities, db.memoryEntries, db.photos, async () => {
      await db.cities.add({
        id: cityId,
        countryCode: input.countryCode,
        countryName: input.countryName,
        cityName: input.cityName.trim(),
        region: blankToUndefined(input.region),
        latitude: input.latitude,
        longitude: input.longitude,
        createdAt: currentDate,
        updatedAt: currentDate,
      });

      for (const file of files) {
        const photoId = createId();
        photoIds.push(photoId);

        await db.photos.add({
          id: photoId,
          cityId,
          entryId,
          fileName: file.name,
          mimeType: file.type || "image/jpeg",
          blob: toBlob(file),
          createdAt: currentDate,
        });
      }

      await db.memoryEntries.add({
        id: entryId,
        cityId,
        visitedAt: input.firstMemory.visitedAt,
        description: blankToUndefined(input.firstMemory.description),
        photoIds,
        createdAt: currentDate,
      });
    });

    await this.maybeMarkUSStateVisited(input.countryCode, input.region);

    return {
      city: {
        id: cityId,
        countryCode: input.countryCode,
        countryName: input.countryName,
        cityName: input.cityName.trim(),
        region: blankToUndefined(input.region),
        latitude: input.latitude,
        longitude: input.longitude,
        createdAt: currentDate,
        updatedAt: currentDate,
      },
      entry: {
        id: entryId,
        cityId,
        visitedAt: input.firstMemory.visitedAt,
        description: blankToUndefined(input.firstMemory.description),
        photoIds,
        createdAt: currentDate,
      },
    };
  }

  async addMemoryEntry(input: AddMemoryEntryInput) {
    const currentDate = nowIso();
    const entryId = createId();
    const photoIds: string[] = [];
    const files = input.files ?? [];

    await db.transaction("rw", db.memoryEntries, db.photos, db.cities, async () => {
      for (const file of files) {
        const photoId = createId();
        photoIds.push(photoId);

        await db.photos.add({
          id: photoId,
          cityId: input.cityId,
          entryId,
          fileName: file.name,
          mimeType: file.type || "image/jpeg",
          blob: toBlob(file),
          createdAt: currentDate,
        });
      }

      await db.memoryEntries.add({
        id: entryId,
        cityId: input.cityId,
        visitedAt: input.visitedAt,
        description: blankToUndefined(input.description),
        photoIds,
        createdAt: currentDate,
      });

      await db.cities.update(input.cityId, { updatedAt: currentDate });
    });

    return {
      id: entryId,
      cityId: input.cityId,
      visitedAt: input.visitedAt,
      description: blankToUndefined(input.description),
      photoIds,
      createdAt: currentDate,
    };
  }

  async deleteMemoryEntry(entryId: string) {
    const currentDate = nowIso();

    await db.transaction("rw", db.memoryEntries, db.photos, db.cities, async () => {
      const existingEntry = await db.memoryEntries.get(entryId);
      if (!existingEntry) {
        throw new Error("Memory entry not found.");
      }

      await db.photos.where("entryId").equals(entryId).delete();
      await db.memoryEntries.delete(entryId);
      await db.cities.update(existingEntry.cityId, { updatedAt: currentDate });
    });
  }

  async setUSStateVisited(input: { code: string; name: string; visited: boolean }) {
    const code = input.code.toUpperCase();
    const stateName = input.name.trim();
    const existing = await db.usStateVisits.get(code);

    await db.usStateVisits.put({
      code,
      name: stateName || existing?.name || code,
      visited: input.visited,
      updatedAt: nowIso(),
    });
  }

  async saveUpcomingTrip(input: { destination: string; departureDate?: string; note?: string }) {
    const destination = input.destination.trim();
    if (!destination) {
      throw new Error("Destination is required.");
    }

    await db.upcomingTrip.put({
      key: UPCOMING_TRIP_KEY,
      destination,
      departureDate: blankToUndefined(input.departureDate),
      note: blankToUndefined(input.note),
      updatedAt: nowIso(),
    });
  }

  async clearUpcomingTrip() {
    await db.upcomingTrip.delete(UPCOMING_TRIP_KEY);
  }

  async exportBackup(): Promise<BackupPayloadV1> {
    const [session, snapshot] = await Promise.all([this.getSession(), this.getSnapshot()]);

    const photos = await Promise.all(
      snapshot.photos.map(async (photo) => ({
        id: photo.id,
        cityId: photo.cityId,
        entryId: photo.entryId,
        fileName: photo.fileName,
        mimeType: photo.mimeType,
        createdAt: photo.createdAt,
        dataUrl: await blobToDataUrl(photo.blob),
      })),
    );

    return {
      version: 3,
      exportedAt: nowIso(),
      session,
      cities: snapshot.cities,
      memoryEntries: snapshot.memoryEntries,
      photos,
      usStateVisits: snapshot.usStateVisits,
      upcomingTrip: snapshot.upcomingTrip
        ? {
            destination: snapshot.upcomingTrip.destination,
            departureDate: snapshot.upcomingTrip.departureDate,
            note: snapshot.upcomingTrip.note,
            updatedAt: snapshot.upcomingTrip.updatedAt,
          }
        : undefined,
    };
  }

  async importBackup(payload: BackupPayloadV1) {
    if (payload.version !== 1 && payload.version !== 2 && payload.version !== 3) {
      throw new Error("Unsupported backup version.");
    }

    await db.transaction(
      "rw",
      [db.session, db.meta, db.cities, db.memoryEntries, db.photos, db.usStateVisits, db.upcomingTrip],
      async () => {
        await Promise.all([
          db.cities.clear(),
          db.memoryEntries.clear(),
          db.photos.clear(),
          db.session.clear(),
          db.usStateVisits.clear(),
          db.upcomingTrip.clear(),
        ]);

        if (payload.cities.length > 0) {
          await db.cities.bulkAdd(payload.cities);
        }

        if (payload.memoryEntries.length > 0) {
          await db.memoryEntries.bulkAdd(payload.memoryEntries);
        }

        for (const photo of payload.photos) {
          await db.photos.add({
            id: photo.id,
            cityId: photo.cityId,
            entryId: photo.entryId,
            fileName: photo.fileName,
            mimeType: photo.mimeType,
            blob: await dataUrlToBlob(photo.dataUrl),
            createdAt: photo.createdAt,
          });
        }

        if (payload.session) {
          await db.session.put({ key: SESSION_KEY, value: payload.session });
        }

        if (payload.upcomingTrip?.destination) {
          await db.upcomingTrip.put({
            key: UPCOMING_TRIP_KEY,
            destination: payload.upcomingTrip.destination,
            departureDate: blankToUndefined(payload.upcomingTrip.departureDate),
            note: blankToUndefined(payload.upcomingTrip.note),
            updatedAt: payload.upcomingTrip.updatedAt || nowIso(),
          });
        }

        const normalizedRows = normalizeUSStateVisits(payload.usStateVisits, payload.cities, nowIso());
        if (normalizedRows.length > 0) {
          await db.usStateVisits.bulkPut(normalizedRows);
        }

        await db.meta.put({ key: META_SEEDED_KEY, value: "true" });
      },
    );
  }
}

export const localDexieAdapter = new LocalDexieAdapter();
