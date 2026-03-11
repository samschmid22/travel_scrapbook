"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/hooks/use-app-store";

export function GalleryView() {
  const { photos, photoUrls, cities } = useAppStore();

  const [countryFilter, setCountryFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  const cityById = useMemo(() => new Map(cities.map((city) => [city.id, city])), [cities]);

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

  const photosWithLocation = useMemo(() => {
    return photos
      .map((photo) => {
        const city = cityById.get(photo.cityId);
        return {
          photo,
          city,
          imageUrl: photoUrls[photo.id],
        };
      })
      .filter((item) => {
        if (!item.city) {
          return false;
        }

        const countryMatch = countryFilter === "all" || item.city.countryCode === countryFilter;
        const cityMatch = cityFilter === "all" || item.city.id === cityFilter;

        return countryMatch && cityMatch;
      });
  }, [cityById, cityFilter, countryFilter, photoUrls, photos]);

  const selectedIndex = photosWithLocation.findIndex((item) => item.photo.id === selectedPhotoId);
  const selectedItem = selectedIndex >= 0 ? photosWithLocation[selectedIndex] : null;

  if (photos.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No photos yet"
          description="Upload photos when you add a place or memory entry and they will appear here."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Country</label>
            <select
              className="h-10 w-full rounded-xl border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--text-primary)]"
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
            <label className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">City</label>
            <select
              className="h-10 w-full rounded-xl border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--text-primary)]"
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
        </div>
      </Card>

      {photosWithLocation.length === 0 ? (
        <Card>
          <EmptyState
            title="No photos for this filter"
            description="Try a different country or city filter to see saved images."
          />
        </Card>
      ) : (
        <Card>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {photosWithLocation.map(({ photo, city, imageUrl }) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setSelectedPhotoId(photo.id)}
                className="group overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-2)] text-left"
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
                <div className="p-2">
                  <p className="truncate text-xs font-medium text-[var(--text-primary)]">{city?.cityName ?? "Unknown city"}</p>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">{city?.countryName ?? "Unknown country"}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-5xl rounded-2xl border border-white/20 bg-black/40 p-4 backdrop-blur-sm">
            <button
              type="button"
              className="absolute right-3 top-3 rounded-full bg-black/45 p-2 text-white/90 hover:bg-black/65"
              onClick={() => setSelectedPhotoId(null)}
              aria-label="Close preview"
            >
              <X size={16} />
            </button>

            <div className="max-h-[80vh] overflow-hidden rounded-xl border border-white/20 bg-black/25">
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

            <div className="mt-3 flex items-center justify-between text-sm text-white/90">
              <div>
                <p className="font-medium">
                  {selectedItem.city?.cityName}, {selectedItem.city?.countryName}
                </p>
                <p className="text-xs text-white/70">{selectedItem.photo.fileName}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full bg-black/45 p-2 hover:bg-black/65 disabled:opacity-45"
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
                  className="rounded-full bg-black/45 p-2 hover:bg-black/65 disabled:opacity-45"
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
