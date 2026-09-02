// Normaliza fechas de distintos formatos de broker a YYYY-MM-DD.
export function normalizeDate(raw: string | undefined): string {
  if (!raw) return "";
  const datePart = raw.trim().split(/[,;]/)[0].trim();
  if (/^\d{8}$/.test(datePart)) {
    return `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`;
  }
  return datePart;
}

const SPANISH_MONTHS: Record<string, string> = {
  ene: "01",
  feb: "02",
  mar: "03",
  abr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dic: "12",
};

/** Convierte "15 may 2026, 10:40 a. m." (formato de varias apps latinoamericanas) a "2026-05-15". */
export function normalizeSpanishDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const match = raw
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})\s+([a-záéíóúñ]{3,})\.?\s+(\d{4})/);
  if (!match) return null;
  const [, day, monthRaw, year] = match;
  const month = SPANISH_MONTHS[monthRaw.slice(0, 3)];
  if (!month) return null;
  return `${year}-${month}-${day.padStart(2, "0")}`;
}
