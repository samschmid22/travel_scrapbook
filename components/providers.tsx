"use client";

import { AppStoreProvider } from "@/hooks/use-app-store";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AppStoreProvider>{children}</AppStoreProvider>;
}
