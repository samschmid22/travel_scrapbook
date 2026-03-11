import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function toMonthLabel(isoMonth: string) {
  if (!isoMonth) {
    return "Unknown";
  }

  const [year, month] = isoMonth.split("-").map(Number);
  if (!year || !month) {
    return isoMonth;
  }

  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function createId() {
  return crypto.randomUUID();
}

export function isValidMonthInput(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function sortByDateDesc<T>(items: T[], selector: (item: T) => string) {
  return [...items].sort((a, b) => selector(b).localeCompare(selector(a)));
}
