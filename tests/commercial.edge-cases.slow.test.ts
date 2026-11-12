import { describe, expect, it } from "vitest";
import { commercialSettings } from "@/web/commercial";
import { isInAppBrowser } from "@/web/in-app-browser";

const ADSENSE = { AD_NETWORK: "adsense", ADSENSE_CLIENT: "ca-pub-1234567890123456", ADSENSE_SLOT: "9876543210" };

describe("ads stay off when the configuration is incomplete or wrong", () => {
  it.each([
    ["no network chosen", { ...ADSENSE, AD_NETWORK: undefined }],
    ["a network that isn't known", { ...ADSENSE, AD_NETWORK: "someone-else" }],
    ["no publisher ID", { ...ADSENSE, ADSENSE_CLIENT: undefined }],
    ["a publisher ID in the wrong shape", { ...ADSENSE, ADSENSE_CLIENT: "pub-123" }],
    ["no slot", { ...ADSENSE, ADSENSE_SLOT: "" }],
    ["a slot that isn't a number", { ...ADSENSE, ADSENSE_SLOT: "abc" }],
  ])("%s", (_, env) => {
    expect(commercialSettings(env).ad).toBeNull();
  });

  it("the network name is not fussy about case or spaces", () => {
    expect(commercialSettings({ ...ADSENSE, AD_NETWORK: " AdSense " }).ad?.network).toBe("adsense");
  });
});

describe("the support link", () => {
  it.each(["http://buy.stripe.com/abc", "javascript:alert(1)", "buy.stripe.com/abc", "", "   "])("is off for %j, which is not an https address", (url) => {
    expect(commercialSettings({ SUPPORT_URL: url }).supportUrl).toBeNull();
  });

  it("works without ads, and ads without it", () => {
    expect(commercialSettings({ SUPPORT_URL: "https://buy.stripe.com/abc" })).toEqual({ ad: null, supportUrl: "https://buy.stripe.com/abc" });
    expect(commercialSettings(ADSENSE).supportUrl).toBeNull();
  });
});

describe("telling an in-app browser from the person's own", () => {
  it.each([
    ["Instagram", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.30.100"],
    ["Facebook", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 [FBAN/FBIOS;FBAV/480.0.0;]"],
    ["WhatsApp", "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36 WhatsApp/2.24.20"],
    ["Telegram on Android", "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36 Telegram-Android/11.2.0"],
    ["an unnamed Android WebView", "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 Version/4.0 Chrome/128.0 Mobile Safari/537.36"],
    ["TikTok", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 musical_ly_36.0.0 BytedanceWebview"],
  ])("%s is an in-app browser", (_, userAgent) => {
    expect(isInAppBrowser(userAgent)).toBe(true);
  });

  it.each([
    ["Safari on iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"],
    ["Chrome on Android", "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"],
    ["Chrome on a laptop", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"],
    ["Samsung Internet", "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36"],
  ])("%s is not", (_, userAgent) => {
    expect(isInAppBrowser(userAgent)).toBe(false);
  });
});
