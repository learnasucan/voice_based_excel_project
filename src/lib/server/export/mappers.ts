import { exportColumns } from "@/lib/server/export/columns";
import { ExportRow } from "@/lib/server/export/types";

export const mapRowsToSheetData = (rows: ExportRow[]) => {
  const total = rows.reduce((sum, row) => sum + row.contributionAmount, 0);

  return {
    headers: [...exportColumns],
    rows: rows.map((row) => [
      row.serialNumber,
      row.nameMr,
      row.nameEn,
      row.contributionAmount,
      row.placeMr,
      row.placeEn
    ]),
    total
  };
};
