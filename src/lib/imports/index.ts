import { isIbkrActivityStatement, parseIbkrStatement } from "./ibkr";
import { isIbkrTransactionHistory, parseIbkrTransactionHistory } from "./ibkrTransactionHistory";
import { isGenericTemplate, parseGenericTemplate } from "./generic";
import type { ProposedRow } from "./types";

export type ImportFormat = "ibkr" | "generic";
export type ImportFormatOption = ImportFormat | "auto";

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function detectAndParse(
  rawText: string,
  format?: ImportFormatOption,
): { format: ImportFormat; rows: ProposedRow[]; warnings: string[] } {
  const text = stripBom(rawText);
  const chosen: ImportFormatOption = format ?? "auto";

  if (chosen === "ibkr" || chosen === "auto") {
    if (isIbkrTransactionHistory(text)) {
      return { format: "ibkr", ...parseIbkrTransactionHistory(text) };
    }
    if (isIbkrActivityStatement(text)) {
      return { format: "ibkr", ...parseIbkrStatement(text) };
    }
    if (chosen === "ibkr") {
      return {
        format: "ibkr",
        rows: [],
        warnings: [
          "No se reconoció ninguna sección de Interactive Brokers en el archivo (ni Transaction History ni Activity Statement).",
        ],
      };
    }
  }
  if (chosen === "generic" || isGenericTemplate(text)) {
    return { format: "generic", ...parseGenericTemplate(text) };
  }
  return { format: "generic", rows: [], warnings: ["No se reconoció el formato del archivo."] };
}

export type { ProposedRow };
