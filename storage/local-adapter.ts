"use client";

import Dexie, { type Table } from "dexie";

import { normalizeText, createId } from "@/lib/utils";
import type {
  AddMemoryEntryInput,
  AddPlaceInput,
  AppSession,
  BackupPayloadV1,
  CityRecord,
  MemoryEntryRecord,
  PhotoRecord,
} from "@/types/models";
import type { StorageAdapter, StorageSnapshot } from "@/storage/adapter";

const SESSION_KEY = "current";
const META_SEEDED_KEY = "seeded-v1";

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

  constructor() {
    super("been-there-v1");

    this.version(1).stores({
      session: "&key",
      meta: "&key",
      cities: "&id,countryCode,countryName,cityName,updatedAt",
      memoryEntries: "&id,cityId,visitedAt,createdAt",
      photos: "&id,cityId,entryId,createdAt",
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

export class LocalDexieAdapter implements StorageAdapter {
  async initialize() {
    const alreadySeeded = await db.meta.get(META_SEEDED_KEY);
    if (alreadySeeded?.value === "true") {
      return;
    }

    const cityCount = await db.cities.count();
    if (cityCount > 0) {
      await db.meta.put({ key: META_SEEDED_KEY, value: "true" });
      return;
    }

    const currentDate = nowIso();
    const phoenixCityId = createId();
    const firstEntryId = createId();

    await db.transaction("rw", db.cities, db.memoryEntries, db.meta, async () => {
      await db.cities.put({
        id: phoenixCityId,
        countryCode: "US",
        countryName: "United States",
        cityName: "Phoenix",
        region: "Arizona",
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
    const [cities, memoryEntries, photos] = await Promise.all([
      db.cities.toArray(),
      db.memoryEntries.toArray(),
      db.photos.toArray(),
    ]);

    return {
      cities,
      memoryEntries,
      photos,
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
      const entry = await this.addMemoryEntry({
        cityId: existingCity.id,
        visitedAt: input.firstMemory.visitedAt,
        description: input.firstMemory.description,
        files: input.firstMemory.files,
      });

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

    return {
      city: {
        id: cityId,
        countryCode: input.countryCode,
        countryName: input.countryName,
        cityName: input.cityName.trim(),
        region: blankToUndefined(input.region),
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
      version: 1,
      exportedAt: nowIso(),
      session,
      cities: snapshot.cities,
      memoryEntries: snapshot.memoryEntries,
      photos,
    };
  }

  async importBackup(payload: BackupPayloadV1) {
    if (payload.version !== 1) {
      throw new Error("Unsupported backup version.");
    }

    await db.transaction(
      "rw",
      [db.session, db.meta, db.cities, db.memoryEntries, db.photos],
      async () => {
        await Promise.all([
          db.cities.clear(),
          db.memoryEntries.clear(),
          db.photos.clear(),
          db.session.clear(),
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

        await db.meta.put({ key: META_SEEDED_KEY, value: "true" });
      },
    );
  }
}

export const localDexieAdapter = new LocalDexieAdapter();
