// Cliente mínimo para la API no oficial de cotizaciones de Yahoo Finance.
// No es una API pública documentada/soportada por Yahoo — puede cambiar o
// dejar de responder sin aviso. La usamos porque cubre en un solo lugar:
// acciones/ETFs de EE.UU. (sin sufijo), cripto (TICKER-USD) y la Bolsa de
// Valores de Colombia + CDIs (sufijo .CL) — verificado contra tickers reales.
const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/";
const FETCH_TIMEOUT_MS = 8000;

export interface AssetForQuote {
  id: string;
  ticker: string;
  exchange: string | null;
  assetType: string;
}

export function toYahooSymbol(asset: AssetForQuote): string {
  if (asset.exchange === "BVC") return `${asset.ticker}.CL`;
  return asset.ticker;
}

export interface YahooQuoteResult {
  assetId: string;
  symbol: string;
  price: number | null;
  priceDate: string | null;
  currency: string | null;
  error: string | null;
}

async function fetchOne(assetId: string, symbol: string): Promise<YahooQuoteResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${YAHOO_CHART_URL}${encodeURIComponent(symbol)}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: controller.signal,
    });
    if (!res.ok) return { assetId, symbol, price: null, priceDate: null, currency: null, error: `HTTP ${res.status}` };
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const err = data?.chart?.error;
    if (err) return { assetId, symbol, price: null, priceDate: null, currency: null, error: err.description ?? "sin datos" };
    const price = result?.meta?.regularMarketPrice;
    const currency = result?.meta?.currency ?? null;
    const marketTime = result?.meta?.regularMarketTime;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0)
      return { assetId, symbol, price: null, priceDate: null, currency, error: "sin precio válido" };
    if (typeof marketTime !== "number" || !Number.isFinite(marketTime))
      return { assetId, symbol, price: null, priceDate: null, currency, error: "sin fecha de cotización" };
    const priceDate = new Date(marketTime * 1000).toISOString().slice(0, 10);
    return { assetId, symbol, price, priceDate, currency, error: null };
  } catch (e) {
    const message = e instanceof Error && e.name === "AbortError" ? "tiempo de espera agotado" : "error de red";
    return { assetId, symbol, price: null, priceDate: null, currency: null, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

/** Trae cotizaciones para varios activos con concurrencia acotada. */
export async function fetchYahooQuotes(assets: AssetForQuote[], concurrency = 6): Promise<YahooQuoteResult[]> {
  const results: YahooQuoteResult[] = [];
  let index = 0;
  async function worker() {
    while (index < assets.length) {
      const asset = assets[index++];
      results.push(await fetchOne(asset.id, toYahooSymbol(asset)));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, assets.length) }, worker));
  return results;
}
