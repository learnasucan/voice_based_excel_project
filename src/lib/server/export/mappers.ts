import { exportColumns } from "@/lib/server/export/columns";
import { ExportRow } from "@/lib/server/export/types";

export const mapRowsToSheetData = (rows: ExportRow[]) => {
  const total = rows.reduce(
    (sum, row) =>
      row.entryType === "cash" || row.entryType === "cash_and_gift"
        ? sum + (row.contributionAmount ?? 0)
        : sum,
    0
  );

  return {
    headers: [...exportColumns],
    rows: rows.map((row) => [
      row.serialNumber,
      row.nameMr,
      row.nameEn,
      row.entryType,
      row.entryType === "gift" || row.entryType === "unknown" ? "" : row.contributionAmount ?? "",
      row.giftNameMr ?? "",
      row.giftNameEn ?? "",
      row.placeMr,
      row.placeEn
    ]),
    total
  };
};
