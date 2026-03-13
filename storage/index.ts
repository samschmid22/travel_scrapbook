import type { StorageAdapter } from "@/storage/adapter";
import { localDexieAdapter } from "@/storage/local-adapter";
import { isSupabaseConfigured, supabaseStorageAdapter } from "@/storage/supabase-adapter";

// Future Supabase storage adapter can replace this export without touching UI features.
export const storageAdapter: StorageAdapter = isSupabaseConfigured ? supabaseStorageAdapter : localDexieAdapter;
