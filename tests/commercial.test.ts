import { describe, expect, it } from "vitest";
import { commercialSettings } from "@/web/commercial";

describe("ads and the support link", () => {
  it("are off unless configuration turns them on", () => {
    expect(commercialSettings({})).toEqual({ ad: null, supportUrl: null });
  });

  it("turn on with an ad network and a support link", () => {
    const settings = commercialSettings({
      AD_NETWORK: "adsense",
      ADSENSE_CLIENT: "ca-pub-1234567890123456",
      ADSENSE_SLOT: "9876543210",
      SUPPORT_URL: "https://buy.stripe.com/abc123",
    });
    expect(settings).toEqual({
      ad: { network: "adsense", client: "ca-pub-1234567890123456", slot: "9876543210" },
      supportUrl: "https://buy.stripe.com/abc123",
    });
  });
});
