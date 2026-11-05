export function parseCryptoQuotes(data: unknown, now = Date.now()) {
  if (!Array.isArray(data)) throw new Error("Invalid market response.");
  const names: Record<string, string> = {
    BTCUSDT: "Bitcoin",
    ETHUSDT: "Ethereum",
    SOLUSDT: "Solana",
  };
  return data.flatMap((row) => {
    if (!row || typeof row !== "object" || !Object.hasOwn(names, row.symbol))
      return [];
    const price = Number(row.lastPrice),
      change = Number(row.priceChangePercent),
      asOf = row.closeTime;
    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(change) ||
      row.priceChangePercent == null ||
      typeof asOf !== "number" ||
      !Number.isFinite(asOf) ||
      now - asOf > 60000 ||
      asOf - now > 30000
    )
      return [];
    return [
      {
        symbol: row.symbol.slice(0, -4),
        name: names[row.symbol],
        price,
        change,
        category: "Crypto",
        asOf,
      },
    ];
  });
}

const CATALOGUE: Record<string, { symbol: string; name: string; category: string }> = {
  btcusd: { symbol: "BTC", name: "Bitcoin", category: "Crypto" },
  ethusd: { symbol: "ETH", name: "Ethereum", category: "Crypto" },
  solusd: { symbol: "SOL", name: "Solana", category: "Crypto" },
  xauusd: { symbol: "XAU", name: "Gold", category: "Commodities" },
  usousd: { symbol: "WTI", name: "WTI Crude Oil", category: "Commodities" },
  eurusd: { symbol: "EUR/USD", name: "EUR/USD", category: "Forex" },
  usdjpy: { symbol: "USD/JPY", name: "USD/JPY", category: "Forex" },
  audusd: { symbol: "AUD/USD", name: "AUD/USD", category: "Forex" },
  aapl: { symbol: "AAPL", name: "Apple", category: "Stocks" },
  tsla: { symbol: "TSLA", name: "Tesla", category: "Stocks" },
  nvda: { symbol: "NVDA", name: "NVIDIA", category: "Stocks" },
  msft: { symbol: "MSFT", name: "Microsoft", category: "Stocks" },
  amzn: { symbol: "AMZN", name: "Amazon", category: "Stocks" },
};

export type ServerQuote = {
  asOf: number;
  symbol: string;
  name: string;
  price: number;
  change: number;
  category: string;
  status: "live" | "delayed" | "closed";
  source: string;
};

/** Quotes from the `market-data` backend function. Unavailable ones are dropped, never invented. */
export function parseServerQuotes(data: unknown): ServerQuote[] {
  const quotes = (data as { quotes?: Record<string, unknown> } | null)?.quotes;
  if (!quotes || typeof quotes !== "object") throw new Error("Invalid market response.");
  return Object.entries(CATALOGUE).flatMap(([id, meta]) => {
    const q = quotes[id] as
      | { price?: unknown; change_percent?: unknown; as_of?: unknown; status?: unknown; source?: unknown }
      | undefined;
    const price = Number(q?.price);
    const asOf = Date.parse(String(q?.as_of ?? ""));
    const status = q?.status;
    if (
      !Number.isFinite(price) || price <= 0 || !Number.isFinite(asOf) ||
      (status !== "live" && status !== "delayed" && status !== "closed")
    )
      return [];
    const change = Number(q?.change_percent);
    return [{ ...meta, price, change: Number.isFinite(change) ? change : 0, asOf, status, source: String(q?.source ?? "") }];
  });
}
