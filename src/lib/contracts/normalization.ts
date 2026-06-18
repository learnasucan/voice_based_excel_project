import { z } from "zod";

export const NormalizedDuplicateKeySchema = z.object({
  entryType: z.enum(["cash", "gift", "cash_and_gift", "unknown"]),
  nameMrKey: z.string().trim().min(1),
  contributionAmount: z.number().int().positive().nullable(),
  giftNameMrKey: z.string().trim().nullable(),
  placeMrKey: z.string().trim()
});

export type NormalizedDuplicateKey = z.infer<typeof NormalizedDuplicateKeySchema>;
