import { describe, expect, it } from "vitest";
import { processTopUpVoiceWithAi } from "@/lib/server/ai/topUpProcessor";

describe("top-up voice processor", () => {
  it("parses name amount location from a mixed transcript", async () => {
    const result = await processTopUpVoiceWithAi({
      transcript: "गणेश ५०० पुणे",
      currentDraft: {}
    });

    expect(result.nameMr).toBe("गणेश");
    expect(result.placeMr).toContain("पुणे");
    expect(result.contributionAmount).toBe(500);
    expect(result.nameEn.length).toBeGreaterThan(0);
    expect(result.placeEn.length).toBeGreaterThan(0);
  });

  it("parses Hindi amount words in the middle segment", async () => {
    const result = await processTopUpVoiceWithAi({
      transcript: "राहुल दो हजार पांच सौ नागपुर",
      currentDraft: {}
    });

    expect(result.contributionAmount).toBe(2500);
    expect(result.nameMr).toContain("राहुल");
    expect(result.placeMr).toContain("नागपुर");
  });

  it("keeps full multi-token name before numeric amount", async () => {
    const result = await processTopUpVoiceWithAi({
      transcript: "रचित शंकर पाटील 4000 पनवेल",
      currentDraft: {}
    });

    expect(result.nameMr).toBe("रचित शंकर पाटील");
    expect(result.contributionAmount).toBe(4000);
    expect(result.placeMr).toContain("पनवेल");
  });

  it("returns warning when amount segment is missing", async () => {
    const result = await processTopUpVoiceWithAi({
      transcript: "फक्त नाव आणि गाव",
      currentDraft: {}
    });

    expect(result.contributionAmount).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
