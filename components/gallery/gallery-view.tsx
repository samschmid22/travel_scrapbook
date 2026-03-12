"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";

type SortOrder = "newest" | "oldest";

function formatMonthYear(isoMonth: string) {
  const [year, month] = isoMonth.split("-").map(Number);
  if (!year || !month) {
    return isoMonth;
  }

  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export function GalleryView() {
  const { photos, photoUrls, cities, memoryEntries } = useAppStore();

  const [countryFilter, setCountryFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  const cityById = useMemo(() => new Map(cities.map((city) => [city.id, city])), [cities]);
  const entryById = useMemo(() => new Map(memoryEntries.map((entry) => [entry.id, entry])), [memoryEntries]);

  const allCountries = useMemo(() => {
    const unique = new Map<string, string>();
    for (const city of cities) {
      unique.set(city.countryCode, city.countryName);
    }
    return [...unique.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [cities]);

  const allCitiesForCountry = useMemo(() => {
    return cities
      .filter((city) => countryFilter === "all" || city.countryCode === countryFilter)
      .sort((a, b) => a.cityName.localeCompare(b.cityName));
  }, [cities, countryFilter]);

  const monthOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const photo of photos) {
      const entry = entryById.get(photo.entryId);
      const monthKey = entry?.visitedAt || photo.createdAt.slice(0, 7);
      if (monthKey) {
        unique.add(monthKey);
      }
    }

    return [...unique].sort((a, b) => b.localeCompare(a));
  }, [entryById, photos]);

  const photosWithLocation = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return photos
      .map((photo) => {
        const city = cityById.get(photo.cityId);
        const entry = entryById.get(photo.entryId);
        const monthKey = entry?.visitedAt || photo.createdAt.slice(0, 7);

        return {
          photo,
          city,
          imageUrl: photoUrls[photo.id],
          monthKey,
          monthLabel: formatMonthYear(monthKey),
          searchIndex: [
            photo.fileName,
            city?.cityName,
            city?.region,
            city?.countryName,
            monthKey,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
        };
      })
      .filter((item) => {
        if (!item.city) {
          return false;
        }

        const countryMatch = countryFilter === "all" || item.city.countryCode === countryFilter;
        const cityMatch = cityFilter === "all" || item.city.id === cityFilter;
        const monthMatch = monthFilter === "all" || item.monthKey === monthFilter;
        const searchMatch = !normalizedQuery || item.searchIndex.includes(normalizedQuery);

        return countryMatch && cityMatch && monthMatch && searchMatch;
      })
      .sort((a, b) => {
        if (sortOrder === "oldest") {
          return a.photo.createdAt.localeCompare(b.photo.createdAt);
        }
        return b.photo.createdAt.localeCompare(a.photo.createdAt);
      });
  }, [cityById, cityFilter, countryFilter, entryById, monthFilter, photoUrls, photos, searchQuery, sortOrder]);

  const selectedIndex = photosWithLocation.findIndex((item) => item.photo.id === selectedPhotoId);
  const selectedItem = selectedIndex >= 0 ? photosWithLocation[selectedIndex] : null;

  if (photos.length === 0) {
    return (
      <Card className="bg-[linear-gradient(150deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_30%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_12%)_100%)]">
        <EmptyState
          className="[&>h3]:!text-[var(--pink-dark)] [&>h3]:font-semibold [&>p]:!text-[var(--pink-dark)] [&>p]:font-medium"
          title="No photos yet"
          description="Upload photos when you add a place or memory entry and they will appear here."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="bg-[linear-gradient(150deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_30%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_12%)_100%)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-1.5 xl:col-span-2">
            <label className="ds-input-label">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search city, country, or filename"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="ds-input-label">Country</label>
            <select
              className="h-11 w-full rounded-[var(--radius-control)] border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-3),var(--gray-ref)_24%)] px-3 text-base text-[var(--text-primary)]"
              value={countryFilter}
              onChange={(event) => {
                setCountryFilter(event.target.value);
                setCityFilter("all");
              }}
            >
              <option value="all">All countries</option>
              {allCountries.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="ds-input-label">City</label>
            <select
              className="h-11 w-full rounded-[var(--radius-control)] border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-3),var(--gray-ref)_24%)] px-3 text-base text-[var(--text-primary)]"
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
            >
              <option value="all">All cities</option>
              {allCitiesForCountry.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.cityName}
                  {city.region ? `, ${city.region}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="ds-input-label">Month</label>
            <select
              className="h-11 w-full rounded-[var(--radius-control)] border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-3),var(--gray-ref)_24%)] px-3 text-base text-[var(--text-primary)]"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
            >
              <option value="all">All months</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {formatMonthYear(month)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-soft)] pt-3">
          <p className="ds-meta">{photosWithLocation.length} photo results</p>

          <div className="flex items-center gap-2">
            <label className="ds-input-label">Sort</label>
            <select
              className="h-10 rounded-[var(--radius-control)] border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-3),var(--gray-ref)_24%)] px-3 text-sm text-[var(--text-primary)]"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as SortOrder)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
      </Card>

      {photosWithLocation.length === 0 ? (
        <Card className="bg-[linear-gradient(150deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_30%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_12%)_100%)]">
          <EmptyState
            className="[&>h3]:!text-[var(--pink-dark)] [&>h3]:font-semibold [&>p]:!text-[var(--pink-dark)] [&>p]:font-medium"
            title="No photos for this filter"
            description="Try adjusting search or filters to browse your archive."
          />
        </Card>
      ) : (
        <Card className="bg-[linear-gradient(150deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_28%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_10%)_100%)]">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {photosWithLocation.map(({ photo, city, imageUrl, monthLabel }) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setSelectedPhotoId(photo.id)}
                className="group overflow-hidden rounded-[var(--radius-control)] border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-1),var(--gray-ref)_14%)] text-left"
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={photo.fileName}
                    className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="aspect-square w-full bg-[var(--surface-3)]" />
                )}
                <div className="space-y-1 p-2">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {city?.cityName ?? "Unknown city"}
                  </p>
                  <p className="truncate text-xs text-[var(--text-muted)]">{city?.countryName ?? "Unknown country"}</p>
                  <p className="truncate text-xs font-medium text-[var(--text-secondary)]">{monthLabel}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(67,61,78,0.78)] p-4">
          <div className="relative w-full max-w-5xl rounded-[var(--radius-panel)] border border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_36%)] bg-[color-mix(in_oklab,var(--surface-1),var(--gray-ref)_16%)] p-4 backdrop-blur-sm">
            <button
              type="button"
              className="absolute right-3 top-3 rounded-full bg-[color-mix(in_oklab,var(--surface-2),var(--pink-bright)_18%)] p-2 text-[var(--text-primary)] hover:bg-[color-mix(in_oklab,var(--surface-2),var(--pink-bright)_30%)]"
              onClick={() => setSelectedPhotoId(null)}
              aria-label="Close preview"
            >
              <X size={16} />
            </button>

            <div className="max-h-[80vh] overflow-hidden rounded-[var(--radius-card)] border border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_24%)] bg-[color-mix(in_oklab,var(--surface-2),var(--gray-ref)_20%)]">
              {selectedItem.imageUrl ? (
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.photo.fileName}
                  className="max-h-[80vh] w-full object-contain"
                />
              ) : (
                <div className="h-[40vh]" />
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-sm text-[var(--text-primary)]">
              <div>
                <p className="font-medium">
                  {selectedItem.city?.cityName}, {selectedItem.city?.countryName}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">{selectedItem.photo.fileName}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full bg-[color-mix(in_oklab,var(--surface-2),var(--pink-bright)_18%)] p-2 hover:bg-[color-mix(in_oklab,var(--surface-2),var(--pink-bright)_30%)] disabled:opacity-45"
                  disabled={selectedIndex <= 0}
                  onClick={() => {
                    if (selectedIndex > 0) {
                      setSelectedPhotoId(photosWithLocation[selectedIndex - 1]?.photo.id ?? null);
                    }
                  }}
                  aria-label="Previous"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="rounded-full bg-[color-mix(in_oklab,var(--surface-2),var(--pink-bright)_18%)] p-2 hover:bg-[color-mix(in_oklab,var(--surface-2),var(--pink-bright)_30%)] disabled:opacity-45"
                  disabled={selectedIndex >= photosWithLocation.length - 1}
                  onClick={() => {
                    if (selectedIndex < photosWithLocation.length - 1) {
                      setSelectedPhotoId(photosWithLocation[selectedIndex + 1]?.photo.id ?? null);
                    }
                  }}
                  aria-label="Next"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
