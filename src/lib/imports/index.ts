import { isIbkrActivityStatement, parseIbkrStatement } from "./ibkr";
import { isGenericTemplate, parseGenericTemplate } from "./generic";
import type { ProposedRow } from "./types";

export type ImportFormat = "ibkr" | "generic";
export type ImportFormatOption = ImportFormat | "auto";

export function detectAndParse(
  text: string,
  format?: ImportFormatOption,
): { format: ImportFormat; rows: ProposedRow[]; warnings: string[] } {
  const chosen: ImportFormatOption = format ?? "auto";

  if (chosen === "ibkr" || (chosen === "auto" && isIbkrActivityStatement(text))) {
    return { format: "ibkr", ...parseIbkrStatement(text) };
  }
  if (chosen === "generic" || isGenericTemplate(text)) {
    return { format: "generic", ...parseGenericTemplate(text) };
  }
  return { format: "generic", rows: [], warnings: ["No se reconoció el formato del archivo."] };
}

export type { ProposedRow };
