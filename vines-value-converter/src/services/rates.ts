import type { RateMap, RateQuote, RateSymbol } from "../types";

const API_BASE = import.meta.env.VITE_GOLD_API_BASE || "https://api.gold-api.com";

const SYMBOL_NAMES: Record<RateSymbol, string> = {
  XAU: "Gold",
  XAG: "Silver",
  BTC: "Bitcoin",
};

type GoldApiResponse = {
  currency: string;
  name: string;
  price: number;
  symbol: RateSymbol;
  updatedAt: string;
};

export type RateFetchResult = {
  rates: RateMap;
  errors: Partial<Record<RateSymbol, string>>;
};

function isGoldApiResponse(value: unknown): value is GoldApiResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GoldApiResponse>;

  return (
    typeof candidate.price === "number" &&
    candidate.currency === "AUD" &&
    typeof candidate.symbol === "string" &&
    typeof candidate.updatedAt === "string"
  );
}

async function fetchQuote(symbol: RateSymbol): Promise<RateQuote> {
  const response = await fetch(`${API_BASE}/price/${symbol}/AUD`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Gold API returned ${response.status} for ${symbol}`);
  }

  const data = (await response.json()) as unknown;

  if (!isGoldApiResponse(data)) {
    throw new Error(`Gold API returned an invalid ${symbol} quote`);
  }

  return {
    symbol,
    name: data.name || SYMBOL_NAMES[symbol],
    priceAud: data.price,
    currency: "AUD",
    updatedAt: data.updatedAt,
    source: "Gold API",
  };
}

export async function fetchLiveRates(previousRates: RateMap): Promise<RateFetchResult> {
  const symbols: RateSymbol[] = ["XAU", "XAG", "BTC"];
  const settledQuotes = await Promise.allSettled(symbols.map((symbol) => fetchQuote(symbol)));
  const rates = { ...previousRates };
  const errors: RateFetchResult["errors"] = {};

  settledQuotes.forEach((result, index) => {
    const symbol = symbols[index];

    if (result.status === "fulfilled") {
      rates[symbol] = result.value;
      return;
    }

    errors[symbol] =
      result.reason instanceof Error ? result.reason.message : `Could not fetch ${symbol}`;
  });

  return { rates, errors };
}
