import { describe, expect, it } from "vitest";
import { parseCryptoQuotes } from "./lib/market-quotes";
describe("provider quote validation", () => {
  const now = 1793881785000;
  const good = {
    symbol: "BTCUSDT",
    lastPrice: "80070.28",
    priceChangePercent: "2.1",
    closeTime: now,
  };
  it("keeps exact Binance values and timestamp", () => {
    expect(parseCryptoQuotes([good], now)[0]).toMatchObject({
      symbol: "BTC",
      price: 80070.28,
      asOf: now,
    });
  });
  it("rejects stale, future, unknown and invalid values", () => {
    for (const patch of [
      { closeTime: now - 60001 },
      { closeTime: now + 30001 },
      { closeTime: null },
      { lastPrice: "NaN" },
      { lastPrice: "-1" },
      { symbol: "XAUUSD" },
      { priceChangePercent: null },
    ]) {
      expect(parseCryptoQuotes([{ ...good, ...patch }], now)).toEqual([]);
    }
  });
});

import { parseServerQuotes } from "./lib/market-quotes";
describe("server market-data quotes", () => {
  const ok = { price: 3909.4, change_percent: 0.4, as_of: "2026-11-05T10:00:00Z", status: "delayed", source: "Twelve Data (delayed)" };
  it("keeps real values with their status and drops unavailable instruments", () => {
    const rows = parseServerQuotes({
      quotes: {
        xauusd: ok,
        aapl: { price: null, change_percent: null, as_of: null, status: "unavailable", source: "none" },
      },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ symbol: "XAU", name: "Gold", price: 3909.4, status: "delayed" });
  });
  it("rejects invalid prices, unknown statuses and malformed responses", () => {
    expect(parseServerQuotes({ quotes: { btcusd: { ...ok, price: -1 } } })).toEqual([]);
    expect(parseServerQuotes({ quotes: { btcusd: { ...ok, status: "sample" } } })).toEqual([]);
    expect(() => parseServerQuotes(null)).toThrow();
  });
});
