import { FieldProcessInput, FieldProcessResult } from "@/lib/contracts/row";

export interface FieldProcessor {
  processField(input: FieldProcessInput): Promise<FieldProcessResult>;
}
