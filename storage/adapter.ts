import type {
  AddMemoryEntryInput,
  AddPlaceInput,
  AppSession,
  BackupPayloadV1,
  CityRecord,
  MemoryEntryRecord,
  PhotoRecord,
} from "@/types/models";

export interface StorageSnapshot {
  cities: CityRecord[];
  memoryEntries: MemoryEntryRecord[];
  photos: PhotoRecord[];
}

export interface StorageAdapter {
  initialize(): Promise<void>;
  getSession(): Promise<AppSession | null>;
  saveSession(session: AppSession | null): Promise<void>;
  getSnapshot(): Promise<StorageSnapshot>;
  addPlace(input: AddPlaceInput): Promise<{ city: CityRecord; entry: MemoryEntryRecord }>;
  addMemoryEntry(input: AddMemoryEntryInput): Promise<MemoryEntryRecord>;
  exportBackup(): Promise<BackupPayloadV1>;
  importBackup(payload: BackupPayloadV1): Promise<void>;
}
