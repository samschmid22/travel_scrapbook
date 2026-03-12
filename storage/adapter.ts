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

export interface StorageSnapshot {
  cities: CityRecord[];
  memoryEntries: MemoryEntryRecord[];
  photos: PhotoRecord[];
  usStateVisits: USStateVisitRecord[];
  upcomingTrip: UpcomingTripRecord | null;
}

export interface StorageAdapter {
  initialize(): Promise<void>;
  getSession(): Promise<AppSession | null>;
  saveSession(session: AppSession | null): Promise<void>;
  getSnapshot(): Promise<StorageSnapshot>;
  addPlace(input: AddPlaceInput): Promise<{ city: CityRecord; entry: MemoryEntryRecord }>;
  addMemoryEntry(input: AddMemoryEntryInput): Promise<MemoryEntryRecord>;
  setUSStateVisited(input: { code: string; name: string; visited: boolean }): Promise<void>;
  saveUpcomingTrip(input: { destination: string; departureDate?: string; note?: string }): Promise<void>;
  clearUpcomingTrip(): Promise<void>;
  exportBackup(): Promise<BackupPayloadV1>;
  importBackup(payload: BackupPayloadV1): Promise<void>;
}
