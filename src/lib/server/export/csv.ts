import { mapRowsToSheetData } from "@/lib/server/export/mappers";
import { ExportRow } from "@/lib/server/export/types";

const escapeCsvValue = (value: string | number | null): string => {
  const asString = String(value);
  if (/[",\n]/.test(asString)) {
    return `"${asString.replace(/"/g, '""')}"`;
  }
  return asString;
};

export const buildCsv = (rows: ExportRow[]): string => {
  const { headers, rows: values, total } = mapRowsToSheetData(rows);
  const lines: string[] = [];

  lines.push(headers.map(escapeCsvValue).join(","));
  for (const row of values) {
    lines.push(row.map((value) => escapeCsvValue(value ?? "")).join(","));
  }

  lines.push(["TOTAL", "", "", "", total, "", "", "", ""].map(escapeCsvValue).join(","));

  return `${lines.join("\n")}\n`;
};
