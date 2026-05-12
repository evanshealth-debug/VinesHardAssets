export type RateSymbol = "XAU" | "XAG" | "BTC";

export type RateQuote = {
  symbol: RateSymbol;
  name: string;
  priceAud: number;
  currency: "AUD";
  updatedAt: string;
  source: string;
};

export type RateMap = Record<RateSymbol, RateQuote>;

export type CowSettings = {
  liveWeightKg: number;
  dressingPercentage: number;
  butcherYieldPercentage: number;
  meatPricePerKg: number;
  processingCostPerAnimal: number;
};

export type CowEconomics = {
  packagedKg: number;
  grossValueAud: number;
  netValueAud: number;
};

export type ConversionHistoryRecord = {
  id: string;
  address: string;
  propertyUrl: string;
  currentEstimateAud: number;
  lastSoldPriceAud: number | null;
  absoluteGainAud: number | null;
  pctGain: number | null;
  btcAud: number;
  xauAud: number;
  xagAud: number;
  valueInBtc: number;
  valueInGoldOz: number;
  valueInSilverOz: number;
  beefNetValueAud: number;
  beefPackagedKg: number;
  valueInBlackAngus: number;
  fetchedAt: string;
  createdAt: string;
  source: "seed" | "local";
};

export type RawSeedHistoryRecord = {
  id: string;
  address: string;
  property_url: string;
  last_sold_price_aud: number | null;
  absolute_gain_aud: number | null;
  pct_gain: number | null;
  current_estimate_aud: number;
  btc_aud: number;
  xau_aud: number;
  xag_aud: number;
  value_in_btc: number;
  value_in_gold_oz: number;
  value_in_silver_oz: number;
  fetched_at: string;
  created_at: string;
};
