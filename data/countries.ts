import { City, Country } from "country-state-city";

import { normalizeText } from "@/lib/utils";

export interface CountryOption {
  code: string;
  name: string;
}

export interface CityOption {
  name: string;
  region?: string;
  label: string;
}

const mapNameOverrides: Record<string, string> = {
  "bosnia and herz": "BA",
  "central african rep": "CF",
  czechia: "CZ",
  "cote d ivoire": "CI",
  "dem rep congo": "CD",
  "dominican rep": "DO",
  "eq guinea": "GQ",
  "falkland is": "FK",
  fiji: "FJ",
  "fr s antarctic lands": "TF",
  "n cyprus": "CY",
  palestine: "PS",
  "s sudan": "SS",
  "solomon is": "SB",
  somaliland: "SO",
  "timor leste": "TL",
  "united states of america": "US",
  "w sahara": "EH",
  eswatini: "SZ",
};

const countries = Country.getAllCountries();

export const countryOptions: CountryOption[] = countries
  .map((country) => ({ code: country.isoCode, name: country.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

const countryByNormalizedName = new Map(countryOptions.map((country) => [normalizeText(country.name), country]));

const cityCache = new Map<string, CityOption[]>();

export function getCountryByCode(code: string) {
  return countryOptions.find((country) => country.code === code);
}

export function mapGeoCountryNameToCode(name: string) {
  const normalized = normalizeText(name);
  const direct = countryByNormalizedName.get(normalized);
  if (direct) {
    return direct.code;
  }

  return mapNameOverrides[normalized];
}

export function getCitiesForCountry(countryCode: string) {
  if (!countryCode) {
    return [];
  }

  const cached = cityCache.get(countryCode);
  if (cached) {
    return cached;
  }

  const dedupe = new Set<string>();
  const options: CityOption[] = [];
  const cities = City.getCitiesOfCountry(countryCode) ?? [];

  for (const city of cities) {
    const region = city.stateCode ?? undefined;
    const key = `${normalizeText(city.name)}-${normalizeText(region ?? "")}`;
    if (dedupe.has(key)) {
      continue;
    }

    dedupe.add(key);
    options.push({
      name: city.name,
      region,
      label: region ? `${city.name}, ${region}` : city.name,
    });
  }

  options.sort((a, b) => a.label.localeCompare(b.label));
  cityCache.set(countryCode, options);

  return options;
}

export function searchCountries(query: string, limit = 40) {
  if (!query.trim()) {
    return countryOptions.slice(0, limit);
  }

  const normalizedQuery = normalizeText(query);
  return countryOptions
    .filter((country) => normalizeText(country.name).includes(normalizedQuery))
    .slice(0, limit);
}

export function searchCities(countryCode: string, query: string, limit = 80) {
  const cities = getCitiesForCountry(countryCode);
  if (!query.trim()) {
    return cities.slice(0, limit);
  }

  const normalizedQuery = normalizeText(query);

  return cities
    .filter((city) => normalizeText(city.label).includes(normalizedQuery))
    .slice(0, limit);
}
