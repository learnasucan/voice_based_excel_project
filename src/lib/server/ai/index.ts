import {
  FieldProcessInput,
  FieldProcessResult,
  TopUpVoiceInput,
  TopUpVoiceResult
} from "@/lib/contracts/row";
import {
  DefaultFieldNormalizationService,
  defaultFieldNormalizationService
} from "@/lib/server/ai/fieldNormalizationService";
import { MockFieldNormalizationProvider } from "@/lib/server/ai/mockFieldNormalizationProvider";
import { openAiFieldProcessor } from "@/lib/server/ai/openAiProcessor";
import { processTopUpVoiceWithAi } from "@/lib/server/ai/topUpProcessor";

export const processFieldWithAi = async (
  input: FieldProcessInput
): Promise<FieldProcessResult> => openAiFieldProcessor.processField(input);

export const processVoiceTopUpWithAi = async (
  input: TopUpVoiceInput
): Promise<TopUpVoiceResult> => processTopUpVoiceWithAi(input);

export { defaultFieldNormalizationService, DefaultFieldNormalizationService, MockFieldNormalizationProvider };
