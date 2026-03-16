import { City, Country, State } from "country-state-city";

import { normalizeText } from "@/lib/utils";

export interface CountryOption {
  code: string;
  name: string;
}

export interface CityOption {
  name: string;
  region?: string;
  regionCode?: string;
  label: string;
  latitude?: number;
  longitude?: number;
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
const stateNameCache = new Map<string, Map<string, string>>();

function parseCoordinate(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getStateNameMap(countryCode: string) {
  const cached = stateNameCache.get(countryCode);
  if (cached) {
    return cached;
  }

  const states = State.getStatesOfCountry(countryCode) ?? [];
  const next = new Map(
    states.map((state) => {
      return [state.isoCode.toUpperCase(), state.name];
    }),
  );

  stateNameCache.set(countryCode, next);
  return next;
}

function toRegionLabel(countryCode: string, stateCode?: string) {
  if (!stateCode) {
    return undefined;
  }

  const normalizedCode = stateCode.toUpperCase();
  const fromMap = getStateNameMap(countryCode).get(normalizedCode);
  return fromMap ?? normalizedCode;
}

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
    const region = toRegionLabel(countryCode, city.stateCode ?? undefined);
    const key = `${normalizeText(city.name)}-${normalizeText(region ?? "")}`;
    if (dedupe.has(key)) {
      continue;
    }

    dedupe.add(key);
    options.push({
      name: city.name,
      region,
      regionCode: city.stateCode?.toUpperCase(),
      label: region ? `${city.name}, ${region}` : city.name,
      latitude: parseCoordinate(city.latitude),
      longitude: parseCoordinate(city.longitude),
    });
  }

  options.sort((a, b) => a.label.localeCompare(b.label));
  cityCache.set(countryCode, options);

  return options;
}

export function findCityCoordinates(countryCode: string, cityName: string, region?: string) {
  const normalizedCity = normalizeText(cityName);
  const normalizedRegion = normalizeText(region ?? "");

  const cityMatches = getCitiesForCountry(countryCode).filter((city) => {
    return normalizeText(city.name) === normalizedCity;
  });

  if (cityMatches.length === 0) {
    return undefined;
  }

  if (normalizedRegion) {
    // When a region/state is provided (common for manual entries), require it to match.
    // This avoids pinning to an unrelated city with the same name in another region.
    const exactRegionMatch = cityMatches.find((city) => {
      const regionMatch = normalizeText(city.region ?? "") === normalizedRegion;
      const regionCodeMatch = normalizeText(city.regionCode ?? "") === normalizedRegion;
      return regionMatch || regionCodeMatch;
    });
    if (!exactRegionMatch) {
      return undefined;
    }

    if (exactRegionMatch.latitude === undefined || exactRegionMatch.longitude === undefined) {
      return undefined;
    }

    return {
      latitude: exactRegionMatch.latitude,
      longitude: exactRegionMatch.longitude,
    };
  }

  const bestMatch = cityMatches[0];

  if (bestMatch?.latitude === undefined || bestMatch.longitude === undefined) {
    return undefined;
  }

  return {
    latitude: bestMatch.latitude,
    longitude: bestMatch.longitude,
  };
}

export function searchCountries(query: string, limit = countryOptions.length) {
  if (!query.trim()) {
    return countryOptions.slice(0, limit);
  }

  const normalizedQuery = normalizeText(query);
  return countryOptions
    .filter((country) => normalizeText(country.name).includes(normalizedQuery))
    .slice(0, limit);
}

export function searchCities(countryCode: string, query: string, limit?: number) {
  const cities = getCitiesForCountry(countryCode);
  const normalizedQuery = normalizeText(query);

  const matches = !normalizedQuery
    ? cities
    : cities.filter((city) => {
        return (
          normalizeText(city.label).includes(normalizedQuery) ||
          normalizeText(city.name).includes(normalizedQuery) ||
          normalizeText(city.region ?? "").includes(normalizedQuery) ||
          normalizeText(city.regionCode ?? "").includes(normalizedQuery)
        );
      });

  if (typeof limit === "number" && limit > 0) {
    return matches.slice(0, limit);
  }

  return matches;
}
