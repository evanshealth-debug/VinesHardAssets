import {
  ArrowLeft,
  Beef,
  Bitcoin,
  CircleDollarSign,
  Coins,
  Download,
  History,
  Loader2,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import seedHistoryRaw from "./data/seedHistory.json";
import { fetchLiveRates } from "./services/rates";
import type {
  ConversionHistoryRecord,
  CowEconomics,
  CowSettings,
  RateMap,
  RateQuote,
  RateSymbol,
  RawSeedHistoryRecord,
} from "./types";

const STORAGE_KEYS = {
  localHistory: "vines-value-converter:history:v1",
  settings: "vines-value-converter:settings:v1",
  property: "vines-value-converter:property:v1",
};

const PROPERTY_URL =
  "https://www.realestate.com.au/property/unit-21-55-the-vines-drive-normanville-sa-5204/";
const ADDRESS = "Unit 21/55 The Vines Drive, Normanville SA 5204";
const DEFAULT_ESTIMATE_AUD = 836000;
const DEFAULT_LAST_SOLD_AUD = 824000;
const AUTO_REFRESH_MS = 60_000;

const DEFAULT_COW_SETTINGS: CowSettings = {
  liveWeightKg: 500,
  dressingPercentage: 60,
  butcherYieldPercentage: 65,
  meatPricePerKg: 22,
  processingCostPerAnimal: 650,
};

const rawSeedHistory = seedHistoryRaw as RawSeedHistoryRecord[];

const currency0 = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

const currency2 = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const number0 = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 });
const number1 = new Intl.NumberFormat("en-AU", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const number2 = new Intl.NumberFormat("en-AU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const number3 = new Intl.NumberFormat("en-AU", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

function calculateCowEconomics(settings: CowSettings): CowEconomics {
  const packagedKg =
    settings.liveWeightKg *
    (settings.dressingPercentage / 100) *
    (settings.butcherYieldPercentage / 100);
  const grossValueAud = packagedKg * settings.meatPricePerKg;
  const netValueAud = Math.max(grossValueAud - settings.processingCostPerAnimal, 0);

  return {
    packagedKg,
    grossValueAud,
    netValueAud,
  };
}

function toSeedRecord(record: RawSeedHistoryRecord): ConversionHistoryRecord {
  const cow = calculateCowEconomics(DEFAULT_COW_SETTINGS);

  return {
    id: record.id,
    address: record.address || ADDRESS,
    propertyUrl: record.property_url || PROPERTY_URL,
    currentEstimateAud: record.current_estimate_aud,
    lastSoldPriceAud: record.last_sold_price_aud,
    absoluteGainAud: record.absolute_gain_aud,
    pctGain: record.pct_gain,
    btcAud: record.btc_aud,
    xauAud: record.xau_aud,
    xagAud: record.xag_aud,
    valueInBtc: record.value_in_btc,
    valueInGoldOz: record.value_in_gold_oz,
    valueInSilverOz: record.value_in_silver_oz,
    beefNetValueAud: cow.netValueAud,
    beefPackagedKg: cow.packagedKg,
    valueInBlackAngus: cow.netValueAud > 0 ? record.current_estimate_aud / cow.netValueAud : 0,
    fetchedAt: record.fetched_at,
    createdAt: record.created_at,
    source: "seed",
  };
}

const seedHistory = rawSeedHistory.map(toSeedRecord);
const latestSeed = seedHistory[seedHistory.length - 1];

function fallbackQuote(symbol: RateSymbol, priceAud: number): RateQuote {
  const names: Record<RateSymbol, string> = {
    XAU: "Gold",
    XAG: "Silver",
    BTC: "Bitcoin",
  };

  return {
    symbol,
    name: names[symbol],
    priceAud,
    currency: "AUD",
    updatedAt: latestSeed?.fetchedAt || new Date().toISOString(),
    source: "Seed fallback",
  };
}

const fallbackRates: RateMap = {
  XAU: fallbackQuote("XAU", latestSeed?.xauAud || 6500),
  XAG: fallbackQuote("XAG", latestSeed?.xagAud || 105),
  BTC: fallbackQuote("BTC", latestSeed?.btcAud || 112000),
};

function formatBtc(value: number): string {
  return value.toFixed(8).replace(/\.?0+$/, "");
}

function formatThousandsCurrency(value: number): string {
  return currency0.format(Math.round(value / 1000) * 1000);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Adelaide",
  }).format(new Date(value));
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    timeZone: "Australia/Adelaide",
  }).format(new Date(value));
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function mergeHistory(localRecords: ConversionHistoryRecord[]): ConversionHistoryRecord[] {
  const records = new Map<string, ConversionHistoryRecord>();

  for (const record of seedHistory) {
    records.set(record.id, record);
  }
  for (const record of localRecords) {
    records.set(record.id, record);
  }

  return [...records.values()].sort(
    (a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime(),
  );
}

function makeId(): string {
  return crypto.randomUUID?.() || `local-${Date.now()}`;
}

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadHistoryCsv(records: ConversionHistoryRecord[]): void {
  const headers = [
    "Date",
    "Address",
    "Property URL",
    "Last Sold Price (AUD)",
    "Current Estimate (AUD)",
    "Absolute Gain (AUD)",
    "Gain (%)",
    "BTC Rate (AUD)",
    "Gold Rate (AUD/oz)",
    "Silver Rate (AUD/oz)",
    "Value in BTC",
    "Value in Gold (oz)",
    "Value in Silver (oz)",
    "Black Angus Net Value (AUD/head)",
    "Value in Black Angus (head)",
    "Source",
  ];

  const lines = [
    headers.map(csvCell).join(","),
    ...records.map((record) =>
      [
        formatDateTime(record.fetchedAt),
        record.address,
        record.propertyUrl,
        record.lastSoldPriceAud,
        record.currentEstimateAud,
        record.absoluteGainAud,
        record.pctGain,
        record.btcAud,
        record.xauAud,
        record.xagAud,
        record.valueInBtc,
        record.valueInGoldOz,
        record.valueInSilverOz,
        record.beefNetValueAud,
        record.valueInBlackAngus,
        record.source,
      ]
        .map(csvCell)
        .join(","),
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vines-conversion-history-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

type PropertyInputs = {
  address: string;
  propertyUrl: string;
  estimateAud: number;
  lastSoldAud: number;
};

type ConversionSummary = {
  estimate: number;
  lastSold: number;
  absoluteGain: number | null;
  pctGain: number | null;
  valueInBtc: number;
  valueInGoldOz: number;
  valueInSilverOz: number;
  valueInBlackAngus: number;
};

function calculateConversion(
  propertyInputs: PropertyInputs,
  rates: RateMap,
  cow: CowEconomics,
): ConversionSummary {
  const estimate = Math.max(propertyInputs.estimateAud || 0, 0);
  const lastSold = Math.max(propertyInputs.lastSoldAud || 0, 0);
  const absoluteGain = lastSold > 0 ? estimate - lastSold : null;
  const pctGain = lastSold > 0 && absoluteGain !== null ? (absoluteGain / lastSold) * 100 : null;

  return {
    estimate,
    lastSold,
    absoluteGain,
    pctGain,
    valueInBtc: rates.BTC.priceAud > 0 ? estimate / rates.BTC.priceAud : 0,
    valueInGoldOz: rates.XAU.priceAud > 0 ? estimate / rates.XAU.priceAud : 0,
    valueInSilverOz: rates.XAG.priceAud > 0 ? estimate / rates.XAG.priceAud : 0,
    valueInBlackAngus: cow.netValueAud > 0 ? estimate / cow.netValueAud : 0,
  };
}

type ConverterProps = {
  localRecords: ConversionHistoryRecord[];
  setLocalRecords: (records: ConversionHistoryRecord[]) => void;
  propertyInputs: PropertyInputs;
  setPropertyInputs: (inputs: PropertyInputs) => void;
  cowSettings: CowSettings;
  setCowSettings: (settings: CowSettings) => void;
  rates: RateMap;
  refreshRates: () => Promise<RateMap | null>;
  ratesLoading: boolean;
  ratesError: string | null;
  lastRateRefreshAt: string;
};

function AppShell() {
  const location = useLocation();
  const [localRecords, setLocalRecords] = useState<ConversionHistoryRecord[]>(() =>
    readJson<ConversionHistoryRecord[]>(STORAGE_KEYS.localHistory, []),
  );
  const [cowSettings, setCowSettings] = useState<CowSettings>(() =>
    readJson<CowSettings>(STORAGE_KEYS.settings, DEFAULT_COW_SETTINGS),
  );
  const [propertyInputs, setPropertyInputs] = useState<PropertyInputs>(() =>
    readJson<PropertyInputs>(STORAGE_KEYS.property, {
      address: ADDRESS,
      propertyUrl: PROPERTY_URL,
      estimateAud: DEFAULT_ESTIMATE_AUD,
      lastSoldAud: DEFAULT_LAST_SOLD_AUD,
    }),
  );
  const [rates, setRates] = useState<RateMap>(fallbackRates);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [lastRateRefreshAt, setLastRateRefreshAt] = useState<string>(latestSeed?.fetchedAt || "");
  const refreshingRef = useRef(false);
  const ratesRef = useRef<RateMap>(fallbackRates);

  useEffect(() => writeJson(STORAGE_KEYS.localHistory, localRecords), [localRecords]);
  useEffect(() => writeJson(STORAGE_KEYS.settings, cowSettings), [cowSettings]);
  useEffect(() => writeJson(STORAGE_KEYS.property, propertyInputs), [propertyInputs]);
  useEffect(() => {
    ratesRef.current = rates;
  }, [rates]);

  const refreshRates = useCallback(async (): Promise<RateMap | null> => {
    if (refreshingRef.current) return null;
    refreshingRef.current = true;
    setRatesLoading(true);
    setRatesError(null);
    try {
      const { rates: liveRates, errors } = await fetchLiveRates(ratesRef.current);
      const failedSymbols = Object.keys(errors);
      ratesRef.current = liveRates;
      setRates(liveRates);
      if (failedSymbols.length < 3) {
        setLastRateRefreshAt(new Date().toISOString());
      }
      setRatesError(
        failedSymbols.length > 0
          ? `${failedSymbols.join(", ")} kept its previous quote because refresh failed.`
          : null,
      );
      return liveRates;
    } catch (error) {
      setRatesError(error instanceof Error ? error.message : "Could not fetch live rates");
      return null;
    } finally {
      setRatesLoading(false);
      refreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    void refreshRates();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshRates();
    };
    const timer = window.setInterval(refreshWhenVisible, AUTO_REFRESH_MS);

    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [refreshRates]);

  const allHistory = useMemo(() => mergeHistory(localRecords), [localRecords]);

  return (
    <>
      {location.pathname !== "/" && (
        <Header
          rates={rates}
          ratesLoading={ratesLoading}
          refreshRates={refreshRates}
          lastRateRefreshAt={lastRateRefreshAt}
        />
      )}
      <main className="app-main">
        <Routes>
          <Route
            path="/"
            element={
              <LandingPage
                propertyInputs={propertyInputs}
                cowSettings={cowSettings}
                rates={rates}
                ratesLoading={ratesLoading}
                ratesError={ratesError}
              />
            }
          />
          <Route
            path="/history"
            element={
              <DetailsPage
                records={allHistory}
                localRecords={localRecords}
                setLocalRecords={setLocalRecords}
                propertyInputs={propertyInputs}
                setPropertyInputs={setPropertyInputs}
                cowSettings={cowSettings}
                setCowSettings={setCowSettings}
                rates={rates}
                refreshRates={refreshRates}
                ratesLoading={ratesLoading}
                ratesError={ratesError}
                lastRateRefreshAt={lastRateRefreshAt}
              />
            }
          />
        </Routes>
      </main>
    </>
  );
}

function Header({
  rates,
  ratesLoading,
  refreshRates,
  lastRateRefreshAt,
}: {
  rates: RateMap;
  ratesLoading: boolean;
  refreshRates: () => Promise<RateMap | null>;
  lastRateRefreshAt: string;
}) {
  const location = useLocation();

  return (
    <header className="site-header">
      <div className="header-content">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <CircleDollarSign size={20} />
          </span>
          <span>
            <strong>Property Value Converter</strong>
            <small>21/55 The Vines Drive</small>
          </span>
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/" end>
            Values
          </NavLink>
          <NavLink to="/history">Details</NavLink>
        </nav>
        {location.pathname !== "/" ? (
          <button className="icon-button" type="button" onClick={() => void refreshRates()}>
            {ratesLoading ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
            <span>Refresh rates</span>
          </button>
        ) : (
          <Link className="icon-button" to="/history">
            <History size={18} />
            <span>Details</span>
          </Link>
        )}
      </div>
      {location.pathname !== "/" && (
        <div className="rate-strip">
          <RatePill
            icon={<Coins size={15} />}
            label="Gold"
            value={currency2.format(rates.XAU.priceAud)}
            updatedAt={rates.XAU.updatedAt}
          />
          <RatePill
            icon={<Coins size={15} />}
            label="Silver"
            value={currency2.format(rates.XAG.priceAud)}
            updatedAt={rates.XAG.updatedAt}
          />
          <RatePill
            icon={<Bitcoin size={15} />}
            label="Bitcoin"
            value={currency0.format(rates.BTC.priceAud)}
            updatedAt={rates.BTC.updatedAt}
          />
          <div className="live-sync">
            <span className={ratesLoading ? "sync-dot loading" : "sync-dot"} />
            <strong>{ratesLoading ? "Syncing live rates" : "Live rates on"}</strong>
            <small>
              {lastRateRefreshAt
                ? `${formatDateTime(lastRateRefreshAt)} Adelaide`
                : "Awaiting first sync"}
            </small>
          </div>
        </div>
      )}
    </header>
  );
}

function RatePill({
  icon,
  label,
  value,
  updatedAt,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  updatedAt: string;
}) {
  return (
    <div className="rate-pill">
      {icon}
      <span>
        {label}
        <small>{formatDateTime(updatedAt)}</small>
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function LandingPage({
  propertyInputs,
  cowSettings,
  rates,
  ratesLoading,
  ratesError,
}: {
  propertyInputs: PropertyInputs;
  cowSettings: CowSettings;
  rates: RateMap;
  ratesLoading: boolean;
  ratesError: string | null;
}) {
  useEffect(() => {
    document.body.classList.add("dashboard-landing-mode");
    return () => document.body.classList.remove("dashboard-landing-mode");
  }, []);

  const cow = useMemo(() => calculateCowEconomics(cowSettings), [cowSettings]);
  const conversion = useMemo(() => calculateConversion(propertyInputs, rates, cow), [
    cow,
    propertyInputs,
    rates,
  ]);
  return (
    <section className="premium-landing" aria-label="Vines value dashboard">
      <div className="premium-shell">
        <div className="premium-kicker">Vines Value Dashboard</div>
        <h1>THE VINES IN HARD ASSETS</h1>
        <p>A simple comparison of the Vines property against scarce assets and real-world value.</p>

        <div className="premium-divider" />

        <div className="premium-grid">
          <MetricCard
            tone="property"
            icon="property"
            label="Estimated Value"
            value={formatThousandsCurrency(conversion.estimate)}
            unit="AUD"
            featured
          />
          <MetricCard
            tone="silver"
            icon="silver"
            label="Silver Equivalent"
            value={
              ratesLoading && conversion.valueInSilverOz === 0
                ? "Loading"
                : number0.format(Math.round(conversion.valueInSilverOz))
            }
            unit="oz silver"
          />
          <MetricCard
            tone="gold"
            icon="gold"
            label="Gold Equivalent"
            value={
              ratesLoading && conversion.valueInGoldOz === 0
                ? "Loading"
                : number1.format(conversion.valueInGoldOz)
            }
            unit="oz gold"
          />
          <MetricCard
            tone="bitcoin"
            icon="bitcoin"
            label="Bitcoin Equivalent"
            value={
              ratesLoading && conversion.valueInBtc === 0
                ? "Loading"
                : conversion.valueInBtc.toFixed(3)
            }
            unit="BTC"
          />
          <MetricCard
            tone="beef"
            icon="beef"
            label="Head of Butchered Black Angus"
            value={number0.format(Math.round(conversion.valueInBlackAngus))}
            unit="head"
          />
        </div>

        <Link className="premium-detail-link" to="/history">
          View data, sources & history
        </Link>
        {ratesError && <span className="premium-fallback">Using the last available live quote.</span>}
      </div>
    </section>
  );
}

function MetricCard({
  tone,
  icon,
  label,
  value,
  unit,
  featured = false,
}: {
  tone: "property" | "silver" | "gold" | "bitcoin" | "beef";
  icon: AssetIconKind;
  label: string;
  value: string;
  unit: string;
  featured?: boolean;
}) {
  return (
    <article className={`metric-card ${tone}${featured ? " featured" : ""}`}>
      <AssetIcon kind={icon} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{unit}</small>
    </article>
  );
}

type AssetIconKind = "property" | "silver" | "gold" | "bitcoin" | "beef";

function AssetIcon({ kind }: { kind: AssetIconKind }) {
  return (
    <span className={`asset-icon ${kind}`} aria-hidden="true">
      {kind === "property" && (
        <svg viewBox="0 0 40 40">
          <path d="M8 22 20 12l12 10v11H8Z" />
          <path d="M15 33V22h10v11" />
          <path d="M9 28c7-5 14-5 22 0" />
          <path d="M27 12c3 0 5 2 5 5-4 0-6-2-5-5Z" />
        </svg>
      )}
      {kind === "silver" && (
        <svg viewBox="0 0 40 40">
          <path d="M9 14c0-4 22-4 22 0v12c0 4-22 4-22 0Z" />
          <path d="M9 14c0 4 22 4 22 0" />
          <path d="M13 21c5 2 10 2 15 0" />
        </svg>
      )}
      {kind === "gold" && (
        <svg viewBox="0 0 40 40">
          <path d="m10 28 5-14h16l-4 14Z" />
          <path d="M15 14h16l-5-5H17Z" />
          <path d="M29 11h4M31 9v4" />
        </svg>
      )}
      {kind === "bitcoin" && (
        <svg viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="13" />
          <path d="M17 11v18M23 11v18M15 14h7.5c4 0 4 6 0 6H15h8.5c4.5 0 4.5 7 0 7H15" />
        </svg>
      )}
      {kind === "beef" && (
        <svg viewBox="0 0 40 40">
          <path d="M10 22c0-6 5-10 12-10h5l4 4v7l-4 5H16c-4 0-6-2-6-6Z" />
          <path d="M12 16 7 12M29 16l5-4M18 28v5M26 28v5" />
          <path d="M18 20c3-1 6-1 9 1" />
        </svg>
      )}
    </span>
  );
}

function DetailsPage({
  records,
  localRecords,
  setLocalRecords,
  propertyInputs,
  setPropertyInputs,
  cowSettings,
  setCowSettings,
  rates,
  refreshRates,
  ratesLoading,
  ratesError,
  lastRateRefreshAt,
}: ConverterProps & {
  records: ConversionHistoryRecord[];
}) {
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const cow = useMemo(() => calculateCowEconomics(cowSettings), [cowSettings]);
  const conversion = useMemo(() => calculateConversion(propertyInputs, rates, cow), [
    cow,
    propertyInputs,
    rates,
  ]);

  const updatePropertyInput = (field: keyof PropertyInputs, value: string) => {
    setPropertyInputs({
      ...propertyInputs,
      [field]: field === "address" || field === "propertyUrl" ? value : Number(value) || 0,
    });
  };

  const updateCowSetting = (field: keyof CowSettings, value: string) => {
    setCowSettings({
      ...cowSettings,
      [field]: Number(value) || 0,
    });
  };

  const createRecord = (rateSnapshot: RateMap): ConversionHistoryRecord => {
    const now = new Date().toISOString();
    const valueInBtc =
      rateSnapshot.BTC.priceAud > 0 ? conversion.estimate / rateSnapshot.BTC.priceAud : 0;
    const valueInGoldOz =
      rateSnapshot.XAU.priceAud > 0 ? conversion.estimate / rateSnapshot.XAU.priceAud : 0;
    const valueInSilverOz =
      rateSnapshot.XAG.priceAud > 0 ? conversion.estimate / rateSnapshot.XAG.priceAud : 0;

    return {
      id: makeId(),
      address: propertyInputs.address,
      propertyUrl: propertyInputs.propertyUrl,
      currentEstimateAud: conversion.estimate,
      lastSoldPriceAud: conversion.lastSold || null,
      absoluteGainAud: conversion.absoluteGain,
      pctGain: conversion.pctGain,
      btcAud: rateSnapshot.BTC.priceAud,
      xauAud: rateSnapshot.XAU.priceAud,
      xagAud: rateSnapshot.XAG.priceAud,
      valueInBtc,
      valueInGoldOz,
      valueInSilverOz,
      beefNetValueAud: cow.netValueAud,
      beefPackagedKg: cow.packagedKg,
      valueInBlackAngus: conversion.valueInBlackAngus,
      fetchedAt: now,
      createdAt: now,
      source: "local",
    };
  };

  const handleConvert = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const liveRates = await refreshRates();
    const record = createRecord(liveRates || rates);
    setLocalRecords([...localRecords, record]);
    setSavedMessage(`Saved snapshot for ${formatDateTime(record.createdAt)}`);
  };

  return (
    <div className="page-stack">
      <section className="hero-band">
        <div>
          <div className="live-pill">
            <span />
            Details page
          </div>
          <h1>Inputs, sources, updates, and history</h1>
          <p>
            Edit the estimate and assumptions, refresh live quotes, save snapshots, and export the
            data.
          </p>
        </div>
        <Link className="button secondary" to="/">
          <ArrowLeft size={18} />
          Back to values
        </Link>
      </section>

      {ratesError && (
        <div className="notice warning">
          Live rates could not be refreshed. Seeded fallback values are still shown.
        </div>
      )}
      {savedMessage && <div className="notice success">{savedMessage}</div>}

      <section className="converter-layout">
        <form className="control-panel" onSubmit={handleConvert}>
          <div className="panel-heading">
            <div>
              <h2>Property Inputs</h2>
              <p>All monetary values are AUD.</p>
            </div>
            <Settings2 size={22} />
          </div>

          <label className="field">
            <span>Real Estate Property URL</span>
            <input
              type="url"
              value={propertyInputs.propertyUrl}
              onChange={(event) => updatePropertyInput("propertyUrl", event.target.value)}
            />
          </label>

          <label className="field">
            <span>Address</span>
            <input
              type="text"
              value={propertyInputs.address}
              onChange={(event) => updatePropertyInput("address", event.target.value)}
            />
          </label>

          <div className="two-fields">
            <label className="field">
              <span>House estimate</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={propertyInputs.estimateAud}
                onChange={(event) => updatePropertyInput("estimateAud", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Last sold price</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={propertyInputs.lastSoldAud}
                onChange={(event) => updatePropertyInput("lastSoldAud", event.target.value)}
              />
            </label>
          </div>

          <details className="details-panel" open>
            <summary>
              <Beef size={17} />
              Advanced Black Angus settings
            </summary>
            <div className="details-grid">
              <NumberField
                label="Live weight per animal (kg)"
                value={cowSettings.liveWeightKg}
                step="1"
                onChange={(value) => updateCowSetting("liveWeightKg", value)}
              />
              <NumberField
                label="Dressing percentage"
                value={cowSettings.dressingPercentage}
                step="0.1"
                onChange={(value) => updateCowSetting("dressingPercentage", value)}
              />
              <NumberField
                label="Butcher yield percentage"
                value={cowSettings.butcherYieldPercentage}
                step="0.1"
                onChange={(value) => updateCowSetting("butcherYieldPercentage", value)}
              />
              <NumberField
                label="Meat price per kg"
                value={cowSettings.meatPricePerKg}
                step="0.01"
                onChange={(value) => updateCowSetting("meatPricePerKg", value)}
              />
              <NumberField
                label="Processing cost per animal"
                value={cowSettings.processingCostPerAnimal}
                step="0.01"
                onChange={(value) => updateCowSetting("processingCostPerAnimal", value)}
              />
            </div>
          </details>

          <button className="button primary full" type="submit" disabled={ratesLoading}>
            {ratesLoading ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
            Convert to BTC, Metals & Black Angus
          </button>
        </form>

        <div className="result-area">
          <section className="estimate-panel">
            <span>Estimated value</span>
            <strong>{currency0.format(conversion.estimate)}</strong>
            <small>
              {conversion.absoluteGain === null
                ? "No last sale comparison"
                : `${currency0.format(conversion.absoluteGain)} since last sale (${number2.format(
                    conversion.pctGain || 0,
                  )}%)`}
            </small>
          </section>

          <div className="asset-grid">
            <AssetCard
              tone="blue"
              icon={<Bitcoin size={20} />}
              label="Value in Bitcoin"
              value={`${formatBtc(conversion.valueInBtc)} BTC`}
              detail={`1 BTC = ${currency0.format(rates.BTC.priceAud)}`}
            />
            <AssetCard
              tone="gold"
              icon={<Coins size={20} />}
              label="Value in Gold"
              value={`${number3.format(conversion.valueInGoldOz)} oz`}
              detail={`1 oz XAU = ${currency2.format(rates.XAU.priceAud)}`}
            />
            <AssetCard
              tone="silver"
              icon={<Coins size={20} />}
              label="Value in Silver"
              value={`${number1.format(conversion.valueInSilverOz)} oz`}
              detail={`1 oz XAG = ${currency2.format(rates.XAG.priceAud)}`}
            />
            <AssetCard
              tone="green"
              icon={<Beef size={20} />}
              label="Butchered Black Angus"
              value={`${number2.format(conversion.valueInBlackAngus)} head`}
              detail={`${currency0.format(cow.netValueAud)} net, ${number1.format(
                cow.packagedKg,
              )} kg packaged`}
            />
          </div>
        </div>
      </section>

      <section className="method-band">
        <div>
          <h2>Rate Source</h2>
          <p>
            Metals and Bitcoin are fetched as AUD quotes from Gold API. Last refresh:{" "}
            {formatDateTime(rates.XAU.updatedAt)}.
          </p>
        </div>
        <a className="button ghost" href="https://gold-api.com/docs" target="_blank" rel="noreferrer">
          Source docs
        </a>
      </section>

      <MiniHistory records={records} />
      <HistoryPage
        records={records}
        localRecords={localRecords}
        setLocalRecords={setLocalRecords}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field compact">
      <span>{label}</span>
      <input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function AssetCard({
  tone,
  icon,
  label,
  value,
  detail,
}: {
  tone: "blue" | "gold" | "silver" | "green";
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className={`asset-card ${tone}`}>
      <div className="asset-label">
        {icon}
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function MiniHistory({ records }: { records: ConversionHistoryRecord[] }) {
  const latest = records[records.length - 1];
  const first = records[0];

  if (!latest || !first) return null;

  return (
    <section className="mini-history">
      <div>
        <h2>History Snapshot</h2>
        <p>
          {records.length} records from {formatDateTime(first.fetchedAt)} to{" "}
          {formatDateTime(latest.fetchedAt)}.
        </p>
      </div>
      <div className="mini-stats">
        <span>
          Latest estimate <strong>{currency0.format(latest.currentEstimateAud)}</strong>
        </span>
        <span>
          Gold equivalent <strong>{number3.format(latest.valueInGoldOz)} oz</strong>
        </span>
        <span>
          Silver equivalent <strong>{number1.format(latest.valueInSilverOz)} oz</strong>
        </span>
      </div>
    </section>
  );
}

function HistoryPage({
  records,
  localRecords,
  setLocalRecords,
}: {
  records: ConversionHistoryRecord[];
  localRecords: ConversionHistoryRecord[];
  setLocalRecords: (records: ConversionHistoryRecord[]) => void;
}) {
  const newestFirst = [...records].reverse();
  const chartData = useMemo(() => {
    if (records.length === 0) return [];
    const first = records[0];
    const base = {
      estimate: first.currentEstimateAud || 1,
      btc: first.valueInBtc || 1,
      gold: first.valueInGoldOz || 1,
      silver: first.valueInSilverOz || 1,
      angus: first.valueInBlackAngus || 1,
      btcRate: first.btcAud || 1,
      goldRate: first.xauAud || 1,
      silverRate: first.xagAud || 1,
    };

    return records.map((record) => ({
      date: formatShortDate(record.fetchedAt),
      estimate: record.currentEstimateAud,
      estimateIndex: (record.currentEstimateAud / base.estimate) * 100,
      btcIndex: (record.valueInBtc / base.btc) * 100,
      goldIndex: (record.valueInGoldOz / base.gold) * 100,
      silverIndex: (record.valueInSilverOz / base.silver) * 100,
      angusIndex: (record.valueInBlackAngus / base.angus) * 100,
      btcRateIndex: (record.btcAud / base.btcRate) * 100,
      goldRateIndex: (record.xauAud / base.goldRate) * 100,
      silverRateIndex: (record.xagAud / base.silverRate) * 100,
    }));
  }, [records]);

  return (
    <div className="page-stack">
      <section className="history-header">
        <div>
          <Link className="back-link" to="/">
            <ArrowLeft size={17} />
            Back to values
          </Link>
          <h1>History & Spreadsheet Export</h1>
          <p>Seeded original records plus locally saved manual snapshots.</p>
        </div>
        <div className="history-actions">
          <button className="button secondary" type="button" onClick={() => downloadHistoryCsv(records)}>
            <Download size={18} />
            Download CSV spreadsheet
          </button>
          <button
            className="button ghost"
            type="button"
            disabled={localRecords.length === 0}
            onClick={() => setLocalRecords([])}
          >
            Clear local snapshots
          </button>
        </div>
      </section>

      <section className="chart-grid">
        <ChartPanel title="House Estimate">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={20} />
              <YAxis tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} />
              <Tooltip formatter={(value) => currency0.format(Number(value))} />
              <Line type="monotone" dataKey="estimate" name="Estimate AUD" stroke="var(--chart-gold)" />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Asset Units Index">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={20} />
              <YAxis tickFormatter={(value) => `${Math.round(Number(value))}`} />
              <Tooltip formatter={(value) => `${number2.format(Number(value))}`} />
              <Legend />
              <Line type="monotone" dataKey="btcIndex" name="BTC" stroke="var(--chart-blue)" dot={false} />
              <Line type="monotone" dataKey="goldIndex" name="Gold oz" stroke="var(--chart-gold)" dot={false} />
              <Line type="monotone" dataKey="silverIndex" name="Silver oz" stroke="var(--chart-silver)" dot={false} />
              <Line type="monotone" dataKey="angusIndex" name="Black Angus" stroke="var(--chart-green)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Rate Index">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={20} />
              <YAxis tickFormatter={(value) => `${Math.round(Number(value))}`} />
              <Tooltip formatter={(value) => `${number2.format(Number(value))}`} />
              <Legend />
              <Line type="monotone" dataKey="btcRateIndex" name="BTC/AUD" stroke="var(--chart-blue)" dot={false} />
              <Line type="monotone" dataKey="goldRateIndex" name="XAU/AUD" stroke="var(--chart-gold)" dot={false} />
              <Line type="monotone" dataKey="silverRateIndex" name="XAG/AUD" stroke="var(--chart-silver)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      <section className="table-panel">
        <div className="panel-heading">
          <div>
            <h2>{records.length} records</h2>
            <p>Newest first</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Estimate</th>
                <th>BTC</th>
                <th>Gold</th>
                <th>Silver</th>
                <th>Black Angus</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {newestFirst.map((record) => (
                <tr key={record.id}>
                  <td>{formatDateTime(record.fetchedAt)}</td>
                  <td>{currency0.format(record.currentEstimateAud)}</td>
                  <td>{formatBtc(record.valueInBtc)}</td>
                  <td>{number3.format(record.valueInGoldOz)} oz</td>
                  <td>{number1.format(record.valueInSilverOz)} oz</td>
                  <td>{number2.format(record.valueInBlackAngus)} head</td>
                  <td>
                    <span className={`source-badge ${record.source}`}>{record.source}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="chart-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
