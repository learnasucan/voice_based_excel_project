import { z } from "zod";

export const NormalizedDuplicateKeySchema = z.object({
  nameMrKey: z.string().trim().min(1),
  contributionAmount: z.number().int().positive(),
  placeMrKey: z.string().trim().min(1)
});

export type NormalizedDuplicateKey = z.infer<typeof NormalizedDuplicateKeySchema>;
