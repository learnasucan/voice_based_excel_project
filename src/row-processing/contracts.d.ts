export interface ContributionRow {
  serialNumber: string;
  nameMr: string;
  nameEn: string;
  contributionAmount: string;
  placeMr: string;
  placeEn: string;
}

export type RowFieldName =
  | "serialNumber"
  | "nameMr"
  | "nameEn"
  | "contributionAmount"
  | "placeMr"
  | "placeEn";

export interface TranscriptCleanupAdapter {
  cleanupFieldText(
    fieldName: RowFieldName,
    value: string,
    row: ContributionRow
  ): Promise<string>;
}

export interface TransliterationAdapter {
  transliterateMrToEn(
    fieldName: "nameMr" | "placeMr",
    marathiText: string,
    row: ContributionRow
  ): Promise<string>;
}

export interface PrepareRowOptions {
  cleanupAdapter?: TranscriptCleanupAdapter;
  transliterationAdapter?: TransliterationAdapter;
  autoFillEnglishFromMarathi?: boolean;
}

export interface PreparedRowResult {
  row: ContributionRow;
  errors: Partial<Record<RowFieldName, string>>;
  isValid: boolean;
  uniquenessKey: string;
}

export interface FindDuplicateOptions {
  ignoreSerialNumber?: string;
}
