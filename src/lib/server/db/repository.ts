import { ContributionRow as PrismaContributionRow, Prisma } from "@prisma/client";
import {
  ContributionRow,
  CreateRowInput,
  DuplicateCheckInput,
  UpdateRowInput
} from "@/lib/contracts/row";
import {
  buildNormalizedDuplicateKey,
  normalizeSpaces
} from "@/lib/server/normalization/rowNormalization";
import { prisma } from "@/lib/server/db/prisma";

export type RowListResult = {
  rows: ContributionRow[];
  totalAmount: number;
  nextSerialNumber: number;
};

export type RowSummaryResult = {
  totalRecords: number;
  totalContribution: number;
  lastSerialNumber: number;
  nextSerialNumber: number;
};

export class DuplicateRowError extends Error {
  matchedRow?: ContributionRow;

  constructor(message: string, matchedRow?: ContributionRow) {
    super(message);
    this.name = "DuplicateRowError";
    this.matchedRow = matchedRow;
  }
}

export class RowNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RowNotFoundError";
  }
}

type ContributionRowClient = Pick<Prisma.TransactionClient, "contributionRow">;

const SERIAL_RETRY_LIMIT = 3;

const mapRow = (row: PrismaContributionRow): ContributionRow => ({
  id: row.id,
  serialNumber: row.serialNumber,
  nameMr: row.nameMr,
  nameEn: row.nameEn,
  entryType: row.entryType as ContributionRow["entryType"],
  contributionAmount: row.contributionAmount,
  giftNameMr: row.giftNameMr,
  giftNameEn: row.giftNameEn,
  placeMr: row.placeMr,
  placeEn: row.placeEn,
  nameMrKey: row.nameMrKey,
  placeMrKey: row.placeMrKey,
  giftNameMrKey: row.giftNameMrKey,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

const sanitizeCreateLikePayload = (payload: Omit<UpdateRowInput, "id">) => ({
  entryType: payload.entryType,
  nameMr: normalizeSpaces(payload.nameMr),
  // Optional transliterations are allowed to keep API stable for Worker A contracts.
  nameEn: normalizeSpaces(payload.nameEn ?? ""),
  contributionAmount:
    payload.entryType === "gift" || payload.entryType === "unknown" ? null : payload.contributionAmount,
  giftNameMr: payload.giftNameMr ? normalizeSpaces(payload.giftNameMr) : null,
  giftNameEn: payload.giftNameEn ? normalizeSpaces(payload.giftNameEn) : null,
  placeMr: normalizeSpaces(payload.placeMr ?? ""),
  placeEn: normalizeSpaces(payload.placeEn ?? "")
});

const isUniqueConstraintError = (
  error: unknown
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

const getDuplicateRowWithClient = async (
  client: ContributionRowClient,
  input: DuplicateCheckInput
): Promise<PrismaContributionRow | null> => {
  const key = buildNormalizedDuplicateKey(input);

  return client.contributionRow.findFirst({
    where: {
      entryType: key.entryType,
      nameMrKey: key.nameMrKey,
      contributionAmount: key.contributionAmount,
      giftNameMrKey: key.giftNameMrKey,
      placeMrKey: key.placeMrKey,
      ...(input.excludeId
        ? {
            NOT: {
              id: input.excludeId
            }
          }
        : {})
    }
  });
};

const getDuplicateRow = async (input: DuplicateCheckInput): Promise<ContributionRow | null> => {
  const duplicate = await getDuplicateRowWithClient(prisma, input);
  return duplicate ? mapRow(duplicate) : null;
};

const getNextSerialNumberWithClient = async (client: ContributionRowClient): Promise<number> => {
  const max = await client.contributionRow.aggregate({
    _max: {
      serialNumber: true
    }
  });

  return (max._max.serialNumber ?? 0) + 1;
};

const getNextSerialNumber = async (): Promise<number> => getNextSerialNumberWithClient(prisma);

const getSummary = async (): Promise<RowSummaryResult> => {
  const [totalRecords, lastSerial, cashAggregates] = await Promise.all([
    prisma.contributionRow.count(),
    prisma.contributionRow.aggregate({
      _max: {
        serialNumber: true
      }
    }),
    prisma.contributionRow.aggregate({
      where: {
        entryType: {
          in: ["cash", "cash_and_gift"]
        }
      },
      _sum: {
        contributionAmount: true
      }
    })
  ]);

  const lastSerialNumber = lastSerial._max.serialNumber ?? 0;

  return {
    totalRecords,
    totalContribution: cashAggregates._sum.contributionAmount ?? 0,
    lastSerialNumber,
    nextSerialNumber: lastSerialNumber + 1
  };
};

const listRows = async (search = ""): Promise<RowListResult> => {
  const normalizedSearch = normalizeSpaces(search);
  const where = normalizedSearch
    ? {
        OR: [
          { nameMr: { contains: normalizedSearch } },
          { nameEn: { contains: normalizedSearch } },
          { entryType: { contains: normalizedSearch } },
          { giftNameMr: { contains: normalizedSearch } },
          { giftNameEn: { contains: normalizedSearch } },
          { placeMr: { contains: normalizedSearch } },
          { placeEn: { contains: normalizedSearch } }
        ]
      }
    : undefined;

  const rows = await prisma.contributionRow.findMany({
    where,
    orderBy: {
      serialNumber: "asc"
    }
  });

  const mappedRows = rows.map(mapRow);
  const totalAmount = mappedRows.reduce(
    (sum, row) =>
      row.entryType === "cash" || row.entryType === "cash_and_gift"
        ? sum + (row.contributionAmount ?? 0)
        : sum,
    0
  );

  return {
    rows: mappedRows,
    totalAmount,
    nextSerialNumber: await getNextSerialNumber()
  };
};

const getRowById = async (id: string): Promise<ContributionRow | null> => {
  const row = await prisma.contributionRow.findUnique({
    where: { id }
  });

  return row ? mapRow(row) : null;
};

const createRow = async (input: CreateRowInput): Promise<ContributionRow> => {
  const payload = sanitizeCreateLikePayload(input);

  const existingDuplicate = await getDuplicateRow({
    nameMr: payload.nameMr,
    entryType: payload.entryType,
    contributionAmount: payload.contributionAmount,
    giftNameMr: payload.giftNameMr,
    placeMr: payload.placeMr
  });

  if (existingDuplicate) {
    throw new DuplicateRowError("Duplicate row detected", existingDuplicate);
  }

  const normalized = buildNormalizedDuplicateKey(payload);

  for (let attempt = 1; attempt <= SERIAL_RETRY_LIMIT; attempt += 1) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const duplicateInTransaction = await getDuplicateRowWithClient(tx, {
          nameMr: payload.nameMr,
          entryType: payload.entryType,
          contributionAmount: payload.contributionAmount,
          giftNameMr: payload.giftNameMr,
          placeMr: payload.placeMr
        });

        if (duplicateInTransaction) {
          throw new DuplicateRowError("Duplicate row detected", mapRow(duplicateInTransaction));
        }

        const serialNumber = await getNextSerialNumberWithClient(tx);

        return tx.contributionRow.create({
          data: {
            serialNumber,
            entryType: payload.entryType,
            nameMr: payload.nameMr,
            nameEn: payload.nameEn,
            contributionAmount: payload.contributionAmount,
            giftNameMr: payload.giftNameMr,
            giftNameEn: payload.giftNameEn,
            placeMr: payload.placeMr,
            placeEn: payload.placeEn,
            nameMrKey: normalized.nameMrKey,
            giftNameMrKey: normalized.giftNameMrKey,
            placeMrKey: normalized.placeMrKey
          }
        });
      });

      return mapRow(created);
    } catch (error) {
      if (error instanceof DuplicateRowError) {
        throw error;
      }

      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      const matchedDuplicate = await getDuplicateRow({
        nameMr: payload.nameMr,
        entryType: payload.entryType,
        contributionAmount: payload.contributionAmount,
        giftNameMr: payload.giftNameMr,
        placeMr: payload.placeMr
      });

      if (matchedDuplicate) {
        throw new DuplicateRowError("Duplicate row detected", matchedDuplicate);
      }

      if (attempt === SERIAL_RETRY_LIMIT) {
        throw error;
      }
    }
  }

  throw new Error("Failed to create row after retrying serial number allocation");
};

const updateRow = async (input: UpdateRowInput): Promise<ContributionRow> => {
  const existing = await prisma.contributionRow.findUnique({
    where: { id: input.id }
  });

  if (!existing) {
    throw new RowNotFoundError("Row not found");
  }

  const payload = sanitizeCreateLikePayload(input);

  const duplicate = await getDuplicateRow({
    nameMr: payload.nameMr,
    entryType: payload.entryType,
    contributionAmount: payload.contributionAmount,
    giftNameMr: payload.giftNameMr,
    placeMr: payload.placeMr,
    excludeId: input.id
  });

  if (duplicate) {
    throw new DuplicateRowError("Duplicate row detected", duplicate);
  }

  const normalized = buildNormalizedDuplicateKey(payload);

  try {
    const updated = await prisma.contributionRow.update({
      where: { id: input.id },
      data: {
        nameMr: payload.nameMr,
        entryType: payload.entryType,
        nameEn: payload.nameEn,
        contributionAmount: payload.contributionAmount,
        giftNameMr: payload.giftNameMr,
        giftNameEn: payload.giftNameEn,
        placeMr: payload.placeMr,
        placeEn: payload.placeEn,
        nameMrKey: normalized.nameMrKey,
        giftNameMrKey: normalized.giftNameMrKey,
        placeMrKey: normalized.placeMrKey
      }
    });

    return mapRow(updated);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const matchedDuplicate = await getDuplicateRow({
        nameMr: payload.nameMr,
        entryType: payload.entryType,
        contributionAmount: payload.contributionAmount,
        giftNameMr: payload.giftNameMr,
        placeMr: payload.placeMr,
        excludeId: input.id
      });

      if (matchedDuplicate) {
        throw new DuplicateRowError("Duplicate row detected", matchedDuplicate);
      }
    }

    throw error;
  }
};

const deleteRow = async (id: string): Promise<void> => {
  const existing = await prisma.contributionRow.findUnique({
    where: { id }
  });

  if (!existing) {
    throw new RowNotFoundError("Row not found");
  }

  await prisma.contributionRow.delete({
    where: { id }
  });
};

export const rowRepository = {
  listRows,
  getSummary,
  getRowById,
  createRow,
  updateRow,
  deleteRow,
  getNextSerialNumber,
  getDuplicateRow
};
