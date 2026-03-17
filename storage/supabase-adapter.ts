"use client";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import { getUSStateCodeFromRegion, usStates } from "@/data/us-states";
import { createId, normalizeText } from "@/lib/utils";
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const PHOTO_BUCKET = "memory-photos";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

interface PlaceRow {
  id: string;
  user_id: string;
  country_code: string;
  country_name: string;
  city_name: string;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

interface MemoryEntryRow {
  id: string;
  user_id: string;
  place_id: string;
  visited_at: string;
  description: string | null;
  created_at: string;
}

interface PhotoRow {
  id: string;
  user_id: string;
  place_id: string;
  memory_entry_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  created_at: string;
}

interface USStateVisitRow {
  state_code: string;
  state_name: string;
  visited: boolean;
  updated_at: string;
}

interface UpcomingTripRow {
  destination: string;
  departure_date: string | null;
  note: string | null;
  updated_at: string;
}

function nowIso() {
  return new Date().toISOString();
}

function blankToUndefined(value?: string | null) {
  if (!value?.trim()) {
    return undefined;
  }

  return value.trim();
}

function nullableText(value?: string | null) {
  return blankToUndefined(value) ?? null;
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "photo.jpg";
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

function toCityRecord(row: PlaceRow): CityRecord {
  return {
    id: row.id,
    countryCode: row.country_code,
    countryName: row.country_name,
    cityName: row.city_name,
    region: blankToUndefined(row.region),
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

function toSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export class SupabaseStorageAdapter implements StorageAdapter {
  private readonly supabase: SupabaseClient | null = toSupabaseClient();

  private get client() {
    if (!this.supabase) {
      throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
    }

    return this.supabase;
  }

  private async getCurrentUser() {
    const { data, error } = await this.client.auth.getUser();
    if (error) {
      // Supabase returns this when no user is signed in yet; treat as signed-out state.
      if (/auth session missing/i.test(error.message)) {
        return null;
      }
      throw new Error(error.message);
    }

    return data.user ?? null;
  }

  private async requireUser() {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error("Please sign in to sync your scrapbook.");
    }

    return user;
  }

  private async updateDisplayName(user: User, displayName: string) {
    const normalizedName = displayName.trim();
    if (!normalizedName) {
      return;
    }

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    if (metadata.displayName === normalizedName) {
      return;
    }

    const { error } = await this.client.auth.updateUser({
      data: {
        ...metadata,
        displayName: normalizedName,
      },
    });

    if (error) {
      // Continue even if metadata update fails; auth/session still valid.
      console.warn("Could not update Supabase user metadata", error.message);
    }
  }

  private async ensureUSStateVisitsRows(userId: string, citiesOverride?: CityRecord[]) {
    const [placesResult, stateVisitsResult] = await Promise.all([
      citiesOverride
        ? Promise.resolve({
            data: citiesOverride,
            error: null,
          })
        : this.client
            .from("places")
            .select("*")
            .eq("user_id", userId)
            .then((result) => ({
              data: (result.data ?? []).map((row) => toCityRecord(row as PlaceRow)),
              error: result.error,
            })),
      this.client
        .from("us_state_visits")
        .select("state_code,state_name,visited,updated_at")
        .eq("user_id", userId),
    ]);

    if (placesResult.error) {
      throw new Error(placesResult.error.message);
    }
    if (stateVisitsResult.error) {
      throw new Error(stateVisitsResult.error.message);
    }

    const existingRows: USStateVisitRecord[] = (stateVisitsResult.data ?? []).map((row) => {
      const record = row as USStateVisitRow;
      return {
        code: record.state_code,
        name: record.state_name,
        visited: record.visited,
        updatedAt: record.updated_at,
      };
    });

    const normalizedRows = normalizeUSStateVisits(existingRows, placesResult.data ?? [], nowIso());
    if (normalizedRows.length === 0) {
      return;
    }

    const rows = normalizedRows.map((row) => ({
      user_id: userId,
      state_code: row.code,
      state_name: row.name,
      visited: row.visited,
      updated_at: row.updatedAt,
    }));

    const { error } = await this.client
      .from("us_state_visits")
      .upsert(rows, { onConflict: "user_id,state_code" });

    if (error) {
      throw new Error(error.message);
    }
  }

  private async ensureSeedData(userId: string) {
    const { count, error: countError } = await this.client
      .from("places")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      throw new Error(countError.message);
    }

    if ((count ?? 0) > 0) {
      await this.ensureUSStateVisitsRows(userId);
      return;
    }

    const createdAt = nowIso();
    const cityId = createId();
    const entryId = createId();

    const { error: placeError } = await this.client.from("places").insert({
      id: cityId,
      user_id: userId,
      country_code: "US",
      country_name: "United States",
      city_name: "Phoenix",
      region: "Arizona",
      latitude: 33.4484,
      longitude: -112.074,
      created_at: createdAt,
      updated_at: createdAt,
    });
    if (placeError) {
      throw new Error(placeError.message);
    }

    const { error: entryError } = await this.client.from("memory_entries").insert({
      id: entryId,
      user_id: userId,
      place_id: cityId,
      visited_at: "2024-10",
      description: "First memory saved in Been There.",
      created_at: createdAt,
    });
    if (entryError) {
      throw new Error(entryError.message);
    }

    await this.ensureUSStateVisitsRows(userId, [
      {
        id: cityId,
        countryCode: "US",
        countryName: "United States",
        cityName: "Phoenix",
        region: "Arizona",
        latitude: 33.4484,
        longitude: -112.074,
        createdAt,
        updatedAt: createdAt,
      },
    ]);
  }

  private async maybeMarkUSStateVisited(userId: string, countryCode: string, region?: string) {
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

    // Ensure full 50-state list remains present.
    await this.ensureUSStateVisitsRows(userId);
  }

  private async addMemoryEntryForPlace(
    userId: string,
    placeId: string,
    input: Pick<AddMemoryEntryInput, "visitedAt" | "description" | "files">,
  ) {
    const createdAt = nowIso();
    const entryId = createId();
    const photoIds: string[] = [];
    const files = input.files ?? [];

    const { error: entryError } = await this.client.from("memory_entries").insert({
      id: entryId,
      user_id: userId,
      place_id: placeId,
      visited_at: input.visitedAt,
      description: nullableText(input.description),
      created_at: createdAt,
    });

    if (entryError) {
      throw new Error(entryError.message);
    }

    for (const file of files) {
      const photoId = createId();
      const storagePath = `${userId}/${placeId}/${entryId}/${photoId}-${sanitizeFileName(file.name)}`;
      const mimeType = file.type || "image/jpeg";

      const { error: uploadError } = await this.client.storage.from(PHOTO_BUCKET).upload(storagePath, file, {
        contentType: mimeType,
        upsert: false,
      });
      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { error: photoInsertError } = await this.client.from("photos").insert({
        id: photoId,
        user_id: userId,
        place_id: placeId,
        memory_entry_id: entryId,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: mimeType,
        created_at: createdAt,
      });
      if (photoInsertError) {
        throw new Error(photoInsertError.message);
      }

      photoIds.push(photoId);
    }

    const { error: updatePlaceError } = await this.client
      .from("places")
      .update({ updated_at: createdAt })
      .eq("id", placeId)
      .eq("user_id", userId);
    if (updatePlaceError) {
      throw new Error(updatePlaceError.message);
    }

    return {
      id: entryId,
      cityId: placeId,
      visitedAt: input.visitedAt,
      description: blankToUndefined(input.description),
      photoIds,
      createdAt,
    } as MemoryEntryRecord;
  }

  async initialize() {
    const user = await this.getCurrentUser();
    if (!user) {
      return;
    }

    await this.ensureSeedData(user.id);
  }

  async getSession() {
    const user = await this.getCurrentUser();
    if (!user) {
      return null;
    }

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const displayNameRaw = metadata.displayName;
    const displayName =
      typeof displayNameRaw === "string" && displayNameRaw.trim().length > 0
        ? displayNameRaw.trim()
        : "Traveler";

    return {
      isAuthenticated: true,
      displayName,
      signedInAt: user.last_sign_in_at ?? user.created_at ?? nowIso(),
    } as AppSession;
  }

  async saveSession(session: AppSession | null) {
    if (!session) {
      const { error } = await this.client.auth.signOut();
      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    let user = await this.getCurrentUser();
    if (!user) {
      const { data, error } = await this.client.auth.signInAnonymously();
      if (error) {
        throw new Error(
          `Could not sign in anonymously. Enable Anonymous auth in Supabase Auth settings. (${error.message})`,
        );
      }

      const anonUser = data.user;
      if (!anonUser) {
        throw new Error("Could not establish Supabase session.");
      }

      user = anonUser;
    }

    if (!user) {
      throw new Error("Could not establish Supabase session.");
    }

    await this.updateDisplayName(user, session.displayName);
    await this.ensureSeedData(user.id);
  }

  async getSnapshot(): Promise<StorageSnapshot> {
    const user = await this.getCurrentUser();
    if (!user) {
      return {
        cities: [],
        memoryEntries: [],
        photos: [],
        usStateVisits: [],
        upcomingTrip: null,
      };
    }

    const [placesResult, entriesResult, photosResult, usStatesResult, upcomingResult] = await Promise.all([
      this.client.from("places").select("*").eq("user_id", user.id),
      this.client.from("memory_entries").select("*").eq("user_id", user.id),
      this.client.from("photos").select("*").eq("user_id", user.id),
      this.client
        .from("us_state_visits")
        .select("state_code,state_name,visited,updated_at")
        .eq("user_id", user.id),
      this.client
        .from("upcoming_trips")
        .select("destination,departure_date,note,updated_at")
        .eq("user_id", user.id)
        .limit(1),
    ]);

    if (placesResult.error) {
      throw new Error(placesResult.error.message);
    }
    if (entriesResult.error) {
      throw new Error(entriesResult.error.message);
    }
    if (photosResult.error) {
      throw new Error(photosResult.error.message);
    }
    if (usStatesResult.error) {
      throw new Error(usStatesResult.error.message);
    }
    if (upcomingResult.error) {
      throw new Error(upcomingResult.error.message);
    }

    const cities = (placesResult.data ?? []).map((row) => toCityRecord(row as PlaceRow));
    const photoRows = (photosResult.data ?? []) as PhotoRow[];

    const photos: PhotoRecord[] = await Promise.all(
      photoRows.map(async (row) => {
        const { data, error } = await this.client.storage.from(PHOTO_BUCKET).download(row.storage_path);
        const blob = error || !data ? new Blob() : data;

        return {
          id: row.id,
          cityId: row.place_id,
          entryId: row.memory_entry_id,
          fileName: row.file_name,
          mimeType: row.mime_type,
          blob,
          createdAt: row.created_at,
        };
      }),
    );

    const photoIdsByEntry = new Map<string, string[]>();
    for (const photo of photos) {
      const list = photoIdsByEntry.get(photo.entryId) ?? [];
      list.push(photo.id);
      photoIdsByEntry.set(photo.entryId, list);
    }

    const memoryEntries: MemoryEntryRecord[] = ((entriesResult.data ?? []) as MemoryEntryRow[]).map((row) => ({
      id: row.id,
      cityId: row.place_id,
      visitedAt: row.visited_at,
      description: blankToUndefined(row.description),
      photoIds: photoIdsByEntry.get(row.id) ?? [],
      createdAt: row.created_at,
    }));

    const usStateVisits: USStateVisitRecord[] = (usStatesResult.data ?? []).map((row) => {
      const record = row as USStateVisitRow;
      return {
        code: record.state_code,
        name: record.state_name,
        visited: record.visited,
        updatedAt: record.updated_at,
      };
    });

    const upcomingRow = (upcomingResult.data?.[0] as UpcomingTripRow | undefined) ?? undefined;
    const upcomingTrip: UpcomingTripRecord | null = upcomingRow
      ? {
          key: "primary",
          destination: upcomingRow.destination,
          departureDate: blankToUndefined(upcomingRow.departure_date),
          note: blankToUndefined(upcomingRow.note),
          updatedAt: upcomingRow.updated_at,
        }
      : null;

    return {
      cities,
      memoryEntries,
      photos,
      usStateVisits,
      upcomingTrip,
    };
  }

  async addPlace(input: AddPlaceInput) {
    const user = await this.requireUser();
    const now = nowIso();
    const normalizedCityName = normalizeText(input.cityName);
    const normalizedRegion = normalizeText(input.region ?? "");

    const { data: countryPlaces, error: countryPlacesError } = await this.client
      .from("places")
      .select("*")
      .eq("user_id", user.id)
      .eq("country_code", input.countryCode);
    if (countryPlacesError) {
      throw new Error(countryPlacesError.message);
    }

    const existingPlace = (countryPlaces ?? []).find((row) => {
      const place = row as PlaceRow;
      return (
        normalizeText(place.city_name) === normalizedCityName &&
        normalizeText(place.region ?? "") === normalizedRegion
      );
    }) as PlaceRow | undefined;

    if (existingPlace) {
      let resolvedPlace = existingPlace;
      const shouldPatchCoordinates =
        (input.latitude !== undefined || input.longitude !== undefined) &&
        (existingPlace.latitude === null || existingPlace.longitude === null);

      if (shouldPatchCoordinates) {
        const { data: updatedPlace, error: updateError } = await this.client
          .from("places")
          .update({
            latitude: input.latitude ?? existingPlace.latitude,
            longitude: input.longitude ?? existingPlace.longitude,
            updated_at: now,
          })
          .eq("id", existingPlace.id)
          .eq("user_id", user.id)
          .select("*")
          .single();

        if (updateError) {
          throw new Error(updateError.message);
        }

        resolvedPlace = updatedPlace as PlaceRow;
      }

      const entry = await this.addMemoryEntryForPlace(user.id, existingPlace.id, input.firstMemory);
      await this.maybeMarkUSStateVisited(user.id, existingPlace.country_code, existingPlace.region ?? input.region);

      return {
        city: toCityRecord(resolvedPlace),
        entry,
      };
    }

    const placeId = createId();
    const placeRow: PlaceRow = {
      id: placeId,
      user_id: user.id,
      country_code: input.countryCode,
      country_name: input.countryName,
      city_name: input.cityName.trim(),
      region: nullableText(input.region),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      created_at: now,
      updated_at: now,
    };

    const { error: insertPlaceError } = await this.client.from("places").insert(placeRow);
    if (insertPlaceError) {
      throw new Error(insertPlaceError.message);
    }

    const entry = await this.addMemoryEntryForPlace(user.id, placeId, input.firstMemory);
    await this.maybeMarkUSStateVisited(user.id, input.countryCode, input.region);

    return {
      city: toCityRecord(placeRow),
      entry,
    };
  }

  async addMemoryEntry(input: AddMemoryEntryInput) {
    const user = await this.requireUser();

    const { data: place, error: placeError } = await this.client
      .from("places")
      .select("*")
      .eq("id", input.cityId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (placeError) {
      throw new Error(placeError.message);
    }
    if (!place) {
      throw new Error("City not found.");
    }

    const entry = await this.addMemoryEntryForPlace(user.id, input.cityId, input);
    const placeRow = place as PlaceRow;
    await this.maybeMarkUSStateVisited(user.id, placeRow.country_code, placeRow.region ?? undefined);
    return entry;
  }

  async deleteMemoryEntry(entryId: string) {
    const user = await this.requireUser();

    const { data: entry, error: entryError } = await this.client
      .from("memory_entries")
      .select("id,place_id")
      .eq("id", entryId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (entryError) {
      throw new Error(entryError.message);
    }
    if (!entry) {
      throw new Error("Memory entry not found.");
    }

    const placeId = String((entry as { place_id?: string }).place_id ?? "");
    if (!placeId) {
      throw new Error("Memory entry is missing a place link.");
    }

    const { data: photoRows, error: photoRowsError } = await this.client
      .from("photos")
      .select("storage_path")
      .eq("memory_entry_id", entryId)
      .eq("user_id", user.id);
    if (photoRowsError) {
      throw new Error(photoRowsError.message);
    }

    const storagePaths = (photoRows ?? [])
      .map((row) => String((row as { storage_path?: string }).storage_path ?? ""))
      .filter(Boolean);

    if (storagePaths.length > 0) {
      const chunkSize = 100;
      for (let index = 0; index < storagePaths.length; index += chunkSize) {
        const chunk = storagePaths.slice(index, index + chunkSize);
        const { error: removeError } = await this.client.storage.from(PHOTO_BUCKET).remove(chunk);
        if (removeError) {
          throw new Error(removeError.message);
        }
      }
    }

    const { error: deletePhotosError } = await this.client
      .from("photos")
      .delete()
      .eq("memory_entry_id", entryId)
      .eq("user_id", user.id);
    if (deletePhotosError) {
      throw new Error(deletePhotosError.message);
    }

    const { error: deleteEntryError } = await this.client
      .from("memory_entries")
      .delete()
      .eq("id", entryId)
      .eq("user_id", user.id);
    if (deleteEntryError) {
      throw new Error(deleteEntryError.message);
    }

    const { data: remainingEntries, error: remainingEntriesError } = await this.client
      .from("memory_entries")
      .select("id")
      .eq("place_id", placeId)
      .eq("user_id", user.id)
      .limit(1);
    if (remainingEntriesError) {
      throw new Error(remainingEntriesError.message);
    }

    const hasRemainingEntries = (remainingEntries ?? []).length > 0;
    if (!hasRemainingEntries) {
      const { data: orphanPhotoRows, error: orphanPhotoRowsError } = await this.client
        .from("photos")
        .select("storage_path")
        .eq("place_id", placeId)
        .eq("user_id", user.id);
      if (orphanPhotoRowsError) {
        throw new Error(orphanPhotoRowsError.message);
      }

      const orphanPaths = (orphanPhotoRows ?? [])
        .map((row) => String((row as { storage_path?: string }).storage_path ?? ""))
        .filter(Boolean);

      if (orphanPaths.length > 0) {
        const chunkSize = 100;
        for (let index = 0; index < orphanPaths.length; index += chunkSize) {
          const chunk = orphanPaths.slice(index, index + chunkSize);
          const { error: removeError } = await this.client.storage.from(PHOTO_BUCKET).remove(chunk);
          if (removeError) {
            throw new Error(removeError.message);
          }
        }
      }

      const { error: deleteOrphanPhotosError } = await this.client
        .from("photos")
        .delete()
        .eq("place_id", placeId)
        .eq("user_id", user.id);
      if (deleteOrphanPhotosError) {
        throw new Error(deleteOrphanPhotosError.message);
      }

      const { error: deletePlaceError } = await this.client
        .from("places")
        .delete()
        .eq("id", placeId)
        .eq("user_id", user.id);
      if (deletePlaceError) {
        throw new Error(deletePlaceError.message);
      }
      return;
    }

    const { error: updatePlaceError } = await this.client
      .from("places")
      .update({ updated_at: nowIso() })
      .eq("id", placeId)
      .eq("user_id", user.id);
    if (updatePlaceError) {
      throw new Error(updatePlaceError.message);
    }
  }

  async setUSStateVisited(input: { code: string; name: string; visited: boolean }) {
    const user = await this.requireUser();
    const stateCode = input.code.toUpperCase();
    const stateName = input.name.trim() || stateCode;

    const { error } = await this.client.from("us_state_visits").upsert(
      {
        user_id: user.id,
        state_code: stateCode,
        state_name: stateName,
        visited: input.visited,
        updated_at: nowIso(),
      },
      { onConflict: "user_id,state_code" },
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  async saveUpcomingTrip(input: { destination: string; departureDate?: string; note?: string }) {
    const user = await this.requireUser();
    const destination = input.destination.trim();
    if (!destination) {
      throw new Error("Destination is required.");
    }

    const { error } = await this.client.from("upcoming_trips").upsert(
      {
        user_id: user.id,
        destination,
        departure_date: nullableText(input.departureDate),
        note: nullableText(input.note),
        updated_at: nowIso(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  async clearUpcomingTrip() {
    const user = await this.requireUser();
    const { error } = await this.client.from("upcoming_trips").delete().eq("user_id", user.id);
    if (error) {
      throw new Error(error.message);
    }
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

    const user = await this.requireUser();

    const { data: existingPhotoRows, error: existingPhotoRowsError } = await this.client
      .from("photos")
      .select("storage_path")
      .eq("user_id", user.id);
    if (existingPhotoRowsError) {
      throw new Error(existingPhotoRowsError.message);
    }

    const existingPaths = (existingPhotoRows ?? [])
      .map((row) => String((row as { storage_path?: string }).storage_path ?? ""))
      .filter(Boolean);

    if (existingPaths.length > 0) {
      const chunkSize = 100;
      for (let index = 0; index < existingPaths.length; index += chunkSize) {
        const chunk = existingPaths.slice(index, index + chunkSize);
        const { error: removeError } = await this.client.storage.from(PHOTO_BUCKET).remove(chunk);
        if (removeError) {
          throw new Error(removeError.message);
        }
      }
    }

    const deleteResponses = await Promise.all([
      this.client.from("photos").delete().eq("user_id", user.id),
      this.client.from("memory_entries").delete().eq("user_id", user.id),
      this.client.from("places").delete().eq("user_id", user.id),
      this.client.from("us_state_visits").delete().eq("user_id", user.id),
      this.client.from("upcoming_trips").delete().eq("user_id", user.id),
    ]);

    for (const response of deleteResponses) {
      if (response.error) {
        throw new Error(response.error.message);
      }
    }

    const placeRows = payload.cities.map((city) => ({
      id: city.id,
      user_id: user.id,
      country_code: city.countryCode,
      country_name: city.countryName,
      city_name: city.cityName,
      region: nullableText(city.region),
      latitude: city.latitude ?? null,
      longitude: city.longitude ?? null,
      created_at: city.createdAt,
      updated_at: city.updatedAt,
    }));

    if (placeRows.length > 0) {
      const { error } = await this.client.from("places").insert(placeRows);
      if (error) {
        throw new Error(error.message);
      }
    }

    const memoryRows = payload.memoryEntries.map((entry) => ({
      id: entry.id,
      user_id: user.id,
      place_id: entry.cityId,
      visited_at: entry.visitedAt,
      description: nullableText(entry.description),
      created_at: entry.createdAt,
    }));

    if (memoryRows.length > 0) {
      const { error } = await this.client.from("memory_entries").insert(memoryRows);
      if (error) {
        throw new Error(error.message);
      }
    }

    for (const photo of payload.photos) {
      const blob = await dataUrlToBlob(photo.dataUrl);
      const storagePath = `${user.id}/${photo.cityId}/${photo.entryId}/${photo.id}-${sanitizeFileName(photo.fileName)}`;

      const { error: uploadError } = await this.client.storage.from(PHOTO_BUCKET).upload(storagePath, blob, {
        contentType: photo.mimeType,
        upsert: true,
      });
      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { error: insertPhotoError } = await this.client.from("photos").insert({
        id: photo.id,
        user_id: user.id,
        place_id: photo.cityId,
        memory_entry_id: photo.entryId,
        storage_path: storagePath,
        file_name: photo.fileName,
        mime_type: photo.mimeType,
        created_at: photo.createdAt,
      });
      if (insertPhotoError) {
        throw new Error(insertPhotoError.message);
      }
    }

    const normalizedStates = normalizeUSStateVisits(payload.usStateVisits, payload.cities, nowIso());
    if (normalizedStates.length > 0) {
      const { error: upsertStateError } = await this.client.from("us_state_visits").upsert(
        normalizedStates.map((state) => ({
          user_id: user.id,
          state_code: state.code,
          state_name: state.name,
          visited: state.visited,
          updated_at: state.updatedAt,
        })),
        { onConflict: "user_id,state_code" },
      );
      if (upsertStateError) {
        throw new Error(upsertStateError.message);
      }
    }

    if (payload.upcomingTrip?.destination) {
      const { error } = await this.client.from("upcoming_trips").upsert(
        {
          user_id: user.id,
          destination: payload.upcomingTrip.destination,
          departure_date: nullableText(payload.upcomingTrip.departureDate),
          note: nullableText(payload.upcomingTrip.note),
          updated_at: payload.upcomingTrip.updatedAt || nowIso(),
        },
        { onConflict: "user_id" },
      );
      if (error) {
        throw new Error(error.message);
      }
    }

    if (payload.session?.displayName) {
      await this.updateDisplayName(user, payload.session.displayName);
    }
  }
}

export const supabaseStorageAdapter = new SupabaseStorageAdapter();
