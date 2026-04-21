import type {
  AIService,
  SummaryPromptInput,
  SummaryPromptResult
} from "@/contracts/services/ai.service";

export class StubAIService implements AIService {
  public readonly providerName = "stub";

  async summarize(input: SummaryPromptInput): Promise<SummaryPromptResult> {
    void input;
    throw new Error("StubAIService.summarize is not implemented yet.");
  }
}
