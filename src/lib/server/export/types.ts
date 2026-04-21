import { ContributionRow } from "@/lib/contracts/row";

export type ExportRow = Pick<
  ContributionRow,
  "serialNumber" | "nameMr" | "nameEn" | "contributionAmount" | "placeMr" | "placeEn"
>;
