import * as XLSX from "xlsx";
import { mapRowsToSheetData } from "@/lib/server/export/mappers";
import { ExportRow } from "@/lib/server/export/types";

export const buildXlsx = (rows: ExportRow[]): Buffer => {
  const { headers, rows: values, total } = mapRowsToSheetData(rows);
  const worksheetData = [headers, ...values, ["TOTAL", "", "", "", total, "", "", "", ""]];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Contributions");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
};
