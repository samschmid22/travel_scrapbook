"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ImagePlus, MapPin, X } from "lucide-react";

import { countryOptions, searchCities, searchCountries, type CityOption } from "@/data/countries";
import { useAppStore } from "@/hooks/use-app-store";
import { Button } from "@/components/ui/button";
import {
  SearchableSelect,
  type SearchableOption,
} from "@/components/ui/searchable-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface AddPlaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function toCountryOptions(query: string): SearchableOption[] {
  return searchCountries(query).map((country) => ({
    value: country.code,
    label: country.name,
  }));
}

function toCityOptions(countryCode: string, query: string): SearchableOption[] {
  return searchCities(countryCode, query).map((city) => ({
    value: JSON.stringify({
      name: city.name,
      region: city.region,
      latitude: city.latitude,
      longitude: city.longitude,
    }),
    label: city.name,
  }));
}

function parseCityValue(optionValue: string): CityOption {
  try {
    const parsed = JSON.parse(optionValue) as {
      name: string;
      region?: string;
      latitude?: number;
      longitude?: number;
    };
    return {
      name: parsed.name,
      region: parsed.region || undefined,
      label: parsed.name,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
    };
  } catch {
    const [name, region] = optionValue.split("|");
    return {
      name,
      region: region || undefined,
      label: name,
    };
  }
}

export function AddPlaceModal({ open, onOpenChange }: AddPlaceModalProps) {
  const { addPlace } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [countryQuery, setCountryQuery] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [selectedCountryName, setSelectedCountryName] = useState("");

  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [manualCityName, setManualCityName] = useState("");
  const [manualCityMode, setManualCityMode] = useState(false);

  const [region, setRegion] = useState("");
  const [visitedAt, setVisitedAt] = useState(currentMonthValue());
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep(1);
    setCountryQuery("");
    setCityQuery("");
    setSelectedCountryCode("");
    setSelectedCountryName("");
    setSelectedCity(null);
    setManualCityMode(false);
    setManualCityName("");
    setRegion("");
    setVisitedAt(currentMonthValue());
    setDescription("");
    setFiles([]);
    setErrorMessage(null);
  }, [open]);

  const countrySelectOptions = useMemo(() => {
    return toCountryOptions(countryQuery);
  }, [countryQuery]);

  const citySelectOptions = useMemo(() => {
    if (!selectedCountryCode) {
      return [];
    }

    return toCityOptions(selectedCountryCode, cityQuery);
  }, [selectedCountryCode, cityQuery]);

  const selectedCountryOption = countryOptions.find((country) => country.code === selectedCountryCode);

  const canContinueStepOne = Boolean(selectedCountryCode);
  const cityName = manualCityMode ? manualCityName.trim() : selectedCity?.name;
  const canContinueStepTwo = Boolean(cityName);
  const canSubmit = Boolean(selectedCountryCode && cityName && visitedAt);

  async function onSubmit() {
    if (!canSubmit || !cityName) {
      return;
    }

    setPending(true);
    setErrorMessage(null);

    try {
      await addPlace({
        countryCode: selectedCountryCode,
        countryName: selectedCountryName || selectedCountryOption?.name || "Unknown",
        cityName,
        region: region.trim() || selectedCity?.region,
        latitude: manualCityMode ? undefined : selectedCity?.latitude,
        longitude: manualCityMode ? undefined : selectedCity?.longitude,
        firstMemory: {
          visitedAt,
          description,
          files,
        },
      });

      onOpenChange(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save this place.");
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(67,61,78,0.62)] p-4 backdrop-blur-sm">
      <div className="mx-auto mt-6 w-full max-w-2xl rounded-[2rem] border border-[var(--border-soft)] bg-[linear-gradient(155deg,color-mix(in_oklab,var(--surface-2),var(--gray-ref)_34%)_0%,color-mix(in_oklab,var(--surface-3),var(--pink-bright)_14%)_100%)] shadow-[var(--shadow-panel)] lg:mt-16">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-6 py-4">
          <div>
            <p className="ds-eyebrow">Add Place</p>
            <h2 className="ds-section-title mt-1">New scrapbook location</h2>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[color-mix(in_oklab,var(--surface-3),var(--pink-soft)_24%)]"
            onClick={() => onOpenChange(false)}
            aria-label="Close add place"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 border-b border-[var(--border-soft)] px-6 py-4">
          {[1, 2, 3].map((number) => (
            <div
              key={number}
              className={`h-2 flex-1 rounded-full ${number <= step ? "bg-[var(--pink-bright)]" : "bg-[color-mix(in_oklab,var(--surface-1),var(--gray-ref)_28%)]"}`}
            />
          ))}
        </div>

        <div className="space-y-5 px-6 py-5">
          {step === 1 ? (
            <>
              <SearchableSelect
                label="Country"
                placeholder="Search country"
                selectedValue={selectedCountryCode}
                query={countryQuery}
                onQueryChange={setCountryQuery}
                options={countrySelectOptions}
                emptyMessage="No country matches your search."
                onSelect={(option) => {
                  setSelectedCountryCode(option.value);
                  setSelectedCountryName(option.label);
                  setCountryQuery(option.label);
                  setSelectedCity(null);
                  setCityQuery("");
                  setManualCityMode(false);
                  setManualCityName("");
                  setRegion("");
                }}
              />

              <p className="text-base text-[var(--text-secondary)]">
                Choose a country first so city lookup and map linking stay accurate.
              </p>
            </>
          ) : null}

          {step === 2 ? (
            <>
              {!manualCityMode ? (
                <SearchableSelect
                  label="City"
                  placeholder={selectedCountryCode ? "Search city" : "Choose a country first"}
                  selectedValue={
                    selectedCity
                      ? JSON.stringify({
                          name: selectedCity.name,
                          region: selectedCity.region,
                          latitude: selectedCity.latitude,
                          longitude: selectedCity.longitude,
                        })
                      : undefined
                  }
                  query={cityQuery}
                  onQueryChange={setCityQuery}
                  options={citySelectOptions}
                  emptyMessage="No city found. You can add it manually below."
                  disabled={!selectedCountryCode}
                  helperText="City list is filtered by your selected country."
                  onSelect={(option) => {
                    const parsed = parseCityValue(option.value);
                    setSelectedCity(parsed);
                    setCityQuery(parsed.name);
                    if (parsed.region) {
                      setRegion(parsed.region);
                    }
                  }}
                />
              ) : (
              <div className="space-y-2">
                <label className="ds-input-label">Manual city name</label>
                <Input
                  value={manualCityName}
                  onChange={(event) => setManualCityName(event.target.value)}
                    placeholder="Enter city manually"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setManualCityMode((current) => !current);
                  setSelectedCity(null);
                  setCityQuery("");
                }}
                className="text-base font-semibold text-[var(--accent-800)] hover:text-[var(--text-primary)]"
              >
                {manualCityMode ? "Back to searchable city list" : "Can’t find your city? Enter it manually"}
              </button>

              <div className="space-y-2">
                <label className="ds-input-label">Region / State (optional)</label>
                <Input
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  placeholder="Example: Arizona"
                />
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="ds-input-label flex items-center gap-2">
                    <Calendar size={14} />
                    Month visited
                  </label>
                  <Input type="month" value={visitedAt} onChange={(event) => setVisitedAt(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="ds-input-label flex items-center gap-2">
                    <MapPin size={14} />
                    Selected place
                  </label>
                  <div className="rounded-xl border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-1),var(--gray-ref)_18%)] px-3 py-2 text-base text-[var(--text-secondary)]">
                    {cityName}, {region ? `${region}, ` : ""}
                    {selectedCountryOption?.name ?? selectedCountryName}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="ds-input-label">Memory note (optional)</label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  placeholder="Capture a highlight from this visit..."
                />
              </div>

              <div className="space-y-2">
                <label className="ds-input-label flex items-center gap-2">
                  <ImagePlus size={14} />
                  Photos (optional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const nextFiles = Array.from(event.target.files ?? []);
                    setFiles(nextFiles);
                  }}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus size={14} />
                    Choose Files
                  </Button>
                  <p className="text-sm text-[var(--text-muted)]">
                    {files.length === 0
                      ? "No files chosen."
                      : `${files.length} file${files.length === 1 ? "" : "s"} chosen.`}
                  </p>
                </div>
              </div>
            </>
          ) : null}

          {errorMessage ? (
            <p className="rounded-xl border border-[color-mix(in_oklab,var(--border-soft),var(--pink-bright)_34%)] bg-[color-mix(in_oklab,var(--surface-1),var(--pink-bright)_12%)] px-3 py-2 text-sm text-[var(--text-primary)]">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse justify-between gap-3 border-t border-[var(--border-soft)] px-6 py-4 sm:flex-row sm:items-center">
          <div>
            {step > 1 ? (
              <Button type="button" variant="secondary" onClick={() => setStep((current) => Math.max(1, current - 1))}>
                Back
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep((current) => current + 1)}
                disabled={step === 1 ? !canContinueStepOne : !canContinueStepTwo}
              >
                Continue
              </Button>
            ) : (
              <Button type="button" onClick={onSubmit} disabled={!canSubmit || pending}>
                {pending ? "Saving..." : "Save place"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
