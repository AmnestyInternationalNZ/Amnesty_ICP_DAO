import { describe, expect, it } from "vitest";
import { createInstance } from "i18next";
import { commissionCatalog } from "../../../frontend/src/i18n/commissionTranslations";
import { commissionEnglish } from "../../../frontend/src/i18n/commission";
import { SUPPORTED_LOCALES } from "../../../frontend/src/i18n/types";
import {
  consultationStatus,
  formatLocalDateTime,
  parseLocalDateTime,
} from "../../../frontend/src/commission-model";

describe("Commission rehearsal interface", () => {
  it("does not offer submissions before opening or after closure", () => {
    const c = { opens: 100n, closes: 200n, closed: false };
    expect(consultationStatus(c, 99n)).toBe("Upcoming");
    expect(consultationStatus(c, 100n)).toBe("Open");
    expect(consultationStatus(c, 200n)).toBe("Open");
    expect(consultationStatus(c, 201n)).toBe("Closed");
    expect(consultationStatus({ ...c, closed: true }, 150n)).toBe("Closed");
  });
  it("keeps consultation dates stable when displayed and saved in local time", () => {
    const timestamp =
      BigInt(new Date("2026-10-01T10:30:00").getTime()) * 1_000_000n;
    expect(formatLocalDateTime(timestamp)).toBe("2026-10-01T10:30");
    expect(parseLocalDateTime(formatLocalDateTime(timestamp))).toBe(timestamp);
    expect(() => parseLocalDateTime("invalid")).toThrow(/valid date/);
  });
  it("provides fallback copy for every supported language and translates navigation", async () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(Object.keys(commissionCatalog(locale)).sort()).toEqual(
        Object.keys(commissionEnglish).sort(),
      );
      if (locale !== "en")
        expect(commissionCatalog(locale)["Working groups"]).not.toBe(
          "Working groups",
        );
    }
    const i18n = createInstance();
    await i18n.init({
      lng: "ar",
      resources: { ar: { commission: commissionCatalog("ar") } },
    });
    expect(
      i18n.t("Working groups", { ns: "commission", keySeparator: false }),
    ).toBe("مجموعات العمل");
    expect(
      i18n.t(
        "Local prototype • fictional information only • pilot groups are illustrative",
        { ns: "commission", keySeparator: false },
      ),
    ).toContain("fictional information");
  });
});
