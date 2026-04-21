import { rowRepository } from "@/lib/server/db/repository";

export const getNextSerialNumber = async (): Promise<number> =>
  rowRepository.getNextSerialNumber();
