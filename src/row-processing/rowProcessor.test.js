/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

const { describe, it, expect } = require("vitest");

const {
  buildRowUniquenessKey,
  findDuplicateRow,
  normalizeContributionAmount,
  prepareRow,
} = require("./rowProcessor");

class MockCleanupAdapter {
  async cleanupFieldText(_fieldName, value) {
    return String(value).replace(/[|]/g, " ");
  }
}

class MockTransliterationAdapter {
  async transliterateMrToEn(fieldName, marathiText) {
    if (fieldName === "nameMr" && marathiText === "राम पाटील") {
      return "Ram Patil";
    }
    if (fieldName === "placeMr" && marathiText === "पुणे") {
      return "Pune";
    }
    return "";
  }
}

describe("rowProcessor", () => {
  it("normalizeContributionAmount handles Marathi digits and suffixes", () => {
    expect(normalizeContributionAmount("₹ १,५००/-")).toBe("1500");
    expect(normalizeContributionAmount(" 2,501.2 ")).toBe("2501");
    expect(normalizeContributionAmount("abc")).toBe("");
  });

  it("prepareRow normalizes row and autofills English transliteration", async () => {
    const result = await prepareRow(
      {
        serialNumber: "००१",
        nameMr: " राम | पाटील ",
        nameEn: "",
        contributionAmount: " ₹ १,५००/- ",
        placeMr: " पुणे ",
        placeEn: "",
      },
      {
        cleanupAdapter: new MockCleanupAdapter(),
        transliterationAdapter: new MockTransliterationAdapter(),
        autoFillEnglishFromMarathi: true,
      }
    );

    expect(result.isValid).toBe(true);
    expect(result.row.serialNumber).toBe("1");
    expect(result.row.nameMr).toBe("राम पाटील");
    expect(result.row.nameEn).toBe("Ram Patil");
    expect(result.row.contributionAmount).toBe("1500");
    expect(result.row.placeMr).toBe("पुणे");
    expect(result.row.placeEn).toBe("Pune");
    expect(result.uniquenessKey).toBe(buildRowUniquenessKey(result.row));
  });

  it("findDuplicateRow detects duplicate while supporting edit ignore serial", async () => {
    const prepared = await prepareRow({
      serialNumber: "1",
      nameMr: "राम पाटील",
      nameEn: "Ram Patil",
      contributionAmount: "1500",
      placeMr: "पुणे",
      placeEn: "Pune",
    });

    const sameContentDifferentFormatting = {
      serialNumber: "2",
      nameMr: " राम   पाटील ",
      nameEn: "ram patil",
      contributionAmount: "₹ १,५००/-",
      placeMr: " पुणे",
      placeEn: "PUNE",
    };

    const duplicate = findDuplicateRow(sameContentDifferentFormatting, [prepared.row]);
    expect(duplicate).toBeTruthy();
    expect(duplicate.index).toBe(0);

    const ignored = findDuplicateRow(sameContentDifferentFormatting, [prepared.row], {
      ignoreSerialNumber: "1",
    });
    expect(ignored).toBeNull();
  });
});
