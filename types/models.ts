export interface AppSession {
  isAuthenticated: true;
  displayName: string;
  signedInAt: string;
}

export interface CityRecord {
  id: string;
  countryCode: string;
  countryName: string;
  cityName: string;
  region?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEntryRecord {
  id: string;
  cityId: string;
  visitedAt: string; // YYYY-MM
  description?: string;
  photoIds: string[];
  createdAt: string;
}

export interface PhotoRecord {
  id: string;
  cityId: string;
  entryId: string;
  fileName: string;
  mimeType: string;
  blob: Blob;
  createdAt: string;
}

export interface USStateVisitRecord {
  code: string;
  name: string;
  visited: boolean;
  updatedAt: string;
}

export interface CitySummary {
  city: CityRecord;
  memoryEntries: MemoryEntryRecord[];
  photoCount: number;
}

export interface AddMemoryEntryInput {
  cityId: string;
  visitedAt: string;
  description?: string;
  files?: File[];
}

export interface AddPlaceInput {
  countryCode: string;
  countryName: string;
  cityName: string;
  region?: string;
  firstMemory: Omit<AddMemoryEntryInput, "cityId">;
}

export interface PhotoBackupRecord {
  id: string;
  cityId: string;
  entryId: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
  dataUrl: string;
}

export interface BackupPayloadV1 {
  version: 1 | 2;
  exportedAt: string;
  session: AppSession | null;
  cities: CityRecord[];
  memoryEntries: MemoryEntryRecord[];
  photos: PhotoBackupRecord[];
  usStateVisits?: USStateVisitRecord[];
}
