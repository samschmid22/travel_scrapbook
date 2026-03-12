import { Country } from "country-state-city";

export type Continent =
  | "Africa"
  | "Asia"
  | "Europe"
  | "North America"
  | "South America"
  | "Oceania"
  | "Antarctica";

const countries = Country.getAllCountries();
const countryByCode = new Map(countries.map((country) => [country.isoCode.toUpperCase(), country]));

const southAmericaCodes = new Set([
  "AR",
  "BO",
  "BR",
  "CL",
  "CO",
  "EC",
  "FK",
  "GF",
  "GY",
  "PY",
  "PE",
  "SR",
  "UY",
  "VE",
]);

const explicitOverrides: Partial<Record<string, Continent>> = {
  AQ: "Antarctica",
  RU: "Europe",
  TR: "Europe",
  KZ: "Asia",
  GE: "Asia",
  AM: "Asia",
  AZ: "Asia",
  CY: "Asia",
  IS: "Europe",
  FO: "Europe",
  PT: "Europe",
  BM: "North America",
  CV: "Africa",
  SH: "Africa",
  GS: "Antarctica",
  IO: "Asia",
  CX: "Oceania",
  CC: "Oceania",
  TF: "Antarctica",
  HM: "Antarctica",
  KM: "Africa",
  MG: "Africa",
  MU: "Africa",
  MV: "Asia",
  RE: "Africa",
  SC: "Africa",
  YT: "Africa",
  SJ: "Europe",
};

function toNumber(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function fallbackFromCoordinates(latitude?: number, longitude?: number): Continent | undefined {
  if (latitude === undefined || longitude === undefined) {
    return undefined;
  }

  if (latitude <= -56) {
    return "Antarctica";
  }

  if (longitude < -25) {
    if (latitude < 13 && latitude > -60) {
      return "South America";
    }
    return "North America";
  }

  if (longitude >= 110 && latitude <= 25) {
    return "Oceania";
  }

  if (longitude >= -20 && longitude <= 60 && latitude >= -38 && latitude <= 38) {
    return "Africa";
  }

  if (longitude >= -12 && longitude <= 60 && latitude > 35) {
    return "Europe";
  }

  return "Asia";
}

export function getContinentForCountryCode(countryCode: string): Continent | undefined {
  const normalizedCode = countryCode.toUpperCase();
  if (explicitOverrides[normalizedCode]) {
    return explicitOverrides[normalizedCode];
  }

  const country = countryByCode.get(normalizedCode);
  if (!country) {
    return undefined;
  }

  const firstZone = country.timezones?.[0]?.zoneName ?? "";
  const prefix = firstZone.split("/")[0];

  if (prefix === "Africa") {
    return "Africa";
  }
  if (prefix === "Asia") {
    return "Asia";
  }
  if (prefix === "Europe") {
    return "Europe";
  }
  if (prefix === "Pacific" || prefix === "Australia") {
    return "Oceania";
  }
  if (prefix === "Antarctica") {
    return "Antarctica";
  }
  if (prefix === "Arctic") {
    return "Europe";
  }
  if (prefix === "America") {
    return southAmericaCodes.has(normalizedCode) ? "South America" : "North America";
  }

  return fallbackFromCoordinates(toNumber(country.latitude), toNumber(country.longitude));
}
