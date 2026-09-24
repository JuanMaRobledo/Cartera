"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney, formatPercent, signClass } from "@/lib/format";
import { ASSET_TYPE_LABELS } from "@/lib/enums";
import { AllocationDonut } from "@/components/charts/AllocationDonut";
import { PerformanceBreakdownChart } from "@/components/charts/PerformanceBreakdownChart";
import { NetWorthHistoryChart, type NetWorthPoint } from "@/components/charts/NetWorthHistoryChart";
import { ColumnPicker, useVisibleColumns, type ColumnDef } from "@/components/ColumnPicker";

interface PositionDto {
  assetId: string;
  ticker: string;
  name: string;
  assetType: string;
  currencyCode: string;
  quantity: number;
  avgCostLocal: number;
  costBasisLocal: number;
  costBasisBase: number;
  costBasisCop: number | null;
  avgPurchaseTrm: number | null;
  currentPriceLocal: number | null;
  marketValueLocal: number | null;
  marketValueBase: number | null;
  marketValueCop: number | null;
  currentTrmToCop: number | null;
  unrealizedPnLLocal: number | null;
  unrealizedPnLBase: number | null;
  realizedPnLLocal: number;
  realizedPnLBase: number;
  dividendsLocal: number;
  dividendsBase: number;
  feesLocal: number;
  feesBase: number;
  totalInvestedLocal: number;
  totalInvestedBase: number;
  totalReturnLocal: number;
  totalReturnBase: number;
  totalReturnLocalPerformanceBase: number;
  totalReturnFxEffectBase: number;
  unrealizedFxPnLCop: number | null;
  realizedFxPnLCop: number | null;
  totalFxPnLCop: number | null;
  trmCoverageComplete: boolean;
  returnPctLocal: number | null;
  returnPct: number | null;
}

interface CashBalanceDto {
  currencyCode: string;
  balance: number;
  balanceBase: number | null;
}

interface CurrencyReturnDto {
  currencyCode: string;
  marketValueLocal: number;
  costBasisLocal: number;
  totalInvestedLocal: number;
  unrealizedPnLLocal: number;
  realizedPnLLocal: number;
  dividendsLocal: number;
  feesLocal: number;
  totalReturnLocal: number;
  returnPct: number | null;
}

interface UsdCopFxSummaryDto {
  currentTrmToCop: number | null;
  avgPurchaseTrm: number | null;
  openCostUsd: number;
  openCostCop: number | null;
  marketValueCop: number | null;
  unrealizedFxPnLCop: number | null;
  realizedFxPnLCop: number | null;
  totalFxPnLCop: number | null;
  usdPositions: number;
  missingTrmPositions: number;
}

interface SummaryDto {
  totalMarketValueBase: number;
  totalCostBase: number;
  totalInvestedBase: number;
  totalUnrealizedBase: number;
  totalRealizedBase: number;
  totalDividendsBase: number;
  totalFeesBase: number;
  totalCashBase: number;
  totalDebtBase: number;
  totalReturnBase: number;
  totalReturnLocalPerformanceBase: number;
  totalReturnFxEffectBase: number;
  totalReturnPct: number | null;
  returnByCurrency: CurrencyReturnDto[];
  usdCopFx: UsdCopFxSummaryDto | null;
  positionsMissingPrice: number;
}

interface PortfolioDto {
  baseCurrency: string;
  positions: PositionDto[];
  cashBalances: CashBalanceDto[];
  summary: SummaryDto;
}

interface AccountDto {
  id: string;
  name: string;
}

type MoneyView = "PURCHASE" | "BASE";

export default function DashboardPage() {
  const [data, setData] = useState<PortfolioDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [accountId, setAccountId] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState("ALL");
  const [currencyFilter, setCurrencyFilter] = useState("ALL");
  const [searchFilter, setSearchFilter] = useState("");
  const [moneyView, setMoneyView] = useState<MoneyView>("PURCHASE");
  const [netWorthHistory, setNetWorthHistory] = useState<NetWorthPoint[]>([]);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  const load = (scopeAccountId: string) =>
    fetch(scopeAccountId ? `/api/portfolio?accountId=${scopeAccountId}` : "/api/portfolio")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("No se pudo cargar la cartera."));

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then(setAccounts);
    fetch("/api/net-worth-history")
      .then((r) => r.json())
      .then(setNetWorthHistory);
  }, []);

  useEffect(() => {
    load(accountId);
  }, [accountId]);

  const refreshPrices = async () => {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await fetch("/api/prices/refresh", { method: "POST" });
      const result = await res.json();
      if (!res.ok) {
        setRefreshMsg("No se pudieron actualizar los precios.");
        return;
      }
      const { updated, failed, trm } = result as {
        updated: unknown[];
        failed: { ticker: string; error: string }[];
        trm?: { ok: true; trm: number } | { ok: false; error: string };
      };
      setRefreshMsg(
        `Se actualizaron ${updated.length} precio(s)` +
          (failed.length > 0 ? `; sin datos para ${failed.map((f) => f.ticker).join(", ")}` : ".") +
          (trm?.ok ? ` TRM actual: ${formatTrm(trm.trm)}.` : ""),
      );
      await load(accountId);
      fetch("/api/net-worth-history")
        .then((r) => r.json())
        .then(setNetWorthHistory);
    } finally {
      setRefreshing(false);
    }
  };

  // Los hooks de abajo tienen que llamarse siempre, en el mismo orden, así
  // que van antes de los "return" tempranos de carga/error — usan valores
  // por defecto hasta que "data" llega.
  const baseCurrencyForColumns = data?.baseCurrency ?? "USD";
  const totalMarketValueBaseForColumns = data?.summary.totalMarketValueBase ?? 0;
  const showPurchaseCurrency = moneyView === "PURCHASE";

  const columns = useMemo<ColumnDef<PositionDto>[]>(
    () => [
      {
        key: "activo",
        label: "Activo",
        defaultVisible: true,
        render: (p) => (
          <>
            <div className="font-medium">{p.ticker}</div>
            <div className="text-xs text-slate-500">{p.name}</div>
          </>
        ),
      },
      {
        key: "tipo",
        label: "Tipo",
        defaultVisible: true,
        render: (p) => ASSET_TYPE_LABELS[p.assetType as keyof typeof ASSET_TYPE_LABELS] ?? p.assetType,
      },
      { key: "cantidad", label: "Cantidad", defaultVisible: true, render: (p) => (p.quantity !== 0 ? p.quantity : "—") },
      {
        key: "peso",
        label: "% Cartera",
        defaultVisible: true,
        render: (p) =>
          p.marketValueBase != null && totalMarketValueBaseForColumns > 0
            ? formatPercent(p.marketValueBase / totalMarketValueBaseForColumns)
            : "—",
      },
      {
        key: "costoProm",
        label: "Costo prom.",
        defaultVisible: true,
        render: (p) => (p.quantity !== 0 ? formatMoney(p.avgCostLocal, p.currencyCode) : "—"),
      },
      {
        key: "precioActual",
        label: "Precio actual",
        defaultVisible: true,
        render: (p) => (p.currentPriceLocal != null ? formatMoney(p.currentPriceLocal, p.currencyCode) : "—"),
      },
      {
        key: "valorMercado",
        label: "Valor mercado",
        defaultVisible: true,
        render: (p) => {
          const value = showPurchaseCurrency ? p.marketValueLocal : p.marketValueBase;
          return value != null
            ? formatMoney(value, showPurchaseCurrency ? p.currencyCode : baseCurrencyForColumns)
            : "—";
        },
      },
      {
        key: "noRealizada",
        label: "No realizada",
        defaultVisible: true,
        render: (p) => {
          const value = showPurchaseCurrency ? p.unrealizedPnLLocal : p.unrealizedPnLBase;
          return value != null ? (
            <span className={signClass(value)}>
              {formatMoney(value, showPurchaseCurrency ? p.currencyCode : baseCurrencyForColumns)}
            </span>
          ) : (
            "—"
          );
        },
      },
      {
        key: "realizada",
        label: "Realizada",
        defaultVisible: true,
        render: (p) => {
          const value = showPurchaseCurrency ? p.realizedPnLLocal : p.realizedPnLBase;
          return (
            <span className={signClass(value)}>
              {formatMoney(value, showPurchaseCurrency ? p.currencyCode : baseCurrencyForColumns)}
            </span>
          );
        },
      },
      {
        key: "dividendos",
        label: "Dividendos",
        defaultVisible: false,
        render: (p) =>
          formatMoney(
            showPurchaseCurrency ? p.dividendsLocal : p.dividendsBase,
            showPurchaseCurrency ? p.currencyCode : baseCurrencyForColumns,
          ),
      },
      {
        key: "comisiones",
        label: "Comisiones",
        defaultVisible: false,
        render: (p) =>
          formatMoney(
            showPurchaseCurrency ? p.feesLocal : p.feesBase,
            showPurchaseCurrency ? p.currencyCode : baseCurrencyForColumns,
          ),
      },
      {
        key: "retornoTotal",
        label: "Retorno total",
        defaultVisible: true,
        render: (p) => {
          const value = showPurchaseCurrency ? p.totalReturnLocal : p.totalReturnBase;
          return (
            <span className={signClass(value)}>
              {formatMoney(value, showPurchaseCurrency ? p.currencyCode : baseCurrencyForColumns)}
            </span>
          );
        },
      },
      {
        key: "retornoPct",
        label: "Retorno %",
        defaultVisible: true,
        render: (p) => {
          const value = showPurchaseCurrency ? p.returnPctLocal : p.returnPct;
          return value != null ? <span className={signClass(value)}>{formatPercent(value)}</span> : "—";
        },
      },
      {
        key: "trmCompra",
        label: "TRM compra",
        defaultVisible: true,
        render: (p) =>
          p.currencyCode === "USD"
            ? p.avgPurchaseTrm != null
              ? formatTrm(p.avgPurchaseTrm)
              : "TRM pendiente"
            : "—",
      },
      {
        key: "valorCop",
        label: "Valor actual COP",
        defaultVisible: false,
        render: (p) =>
          p.currencyCode === "USD" && p.marketValueCop != null
            ? formatMoney(p.marketValueCop, "COP")
            : "—",
      },
      {
        key: "efectoDolarCop",
        label: "Efecto dólar COP",
        defaultVisible: true,
        render: (p) => {
          if (p.currencyCode !== "USD") return "—";
          if (p.totalFxPnLCop == null) return <span className="text-xs text-amber-700">TRM incompleta</span>;
          return (
            <span className="text-xs">
              <span className={signClass(p.totalFxPnLCop)}>
                Total: {formatMoney(p.totalFxPnLCop, "COP")}
              </span>
              <br />
              <span className={signClass(p.unrealizedFxPnLCop ?? 0)}>
                Abierto: {formatMoney(p.unrealizedFxPnLCop ?? 0, "COP")}
              </span>
              {p.realizedFxPnLCop != null && p.realizedFxPnLCop !== 0 && (
                <>
                  <br />
                  <span className={signClass(p.realizedFxPnLCop)}>
                    Realizado: {formatMoney(p.realizedFxPnLCop, "COP")}
                  </span>
                </>
              )}
            </span>
          );
        },
      },
      {
        key: "localVsFx",
        label: showPurchaseCurrency ? "Criterio" : "Local vs. FX",
        defaultVisible: true,
        render: (p) =>
          showPurchaseCurrency ? (
            <span className="text-xs text-slate-500">
              {p.currencyCode} · sin conversión
            </span>
          ) : (
            <span className="text-xs">
              <span className={signClass(p.totalReturnLocalPerformanceBase)}>
                Activo: {formatMoney(p.totalReturnLocalPerformanceBase, baseCurrencyForColumns)}
              </span>
              <br />
              <span className={signClass(p.totalReturnFxEffectBase)}>
                FX: {formatMoney(p.totalReturnFxEffectBase, baseCurrencyForColumns)}
              </span>
            </span>
          ),
      },
    ],
    [baseCurrencyForColumns, showPurchaseCurrency, totalMarketValueBaseForColumns],
  );
  const [visibleColumns, toggleColumn] = useVisibleColumns("cartera:columnas-posiciones", columns);
  const shownColumns = columns.filter((c) => visibleColumns.has(c.key));

  if (error) return <p className="loss-text">{error}</p>;
  if (!data) return <p className="text-slate-500">Cargando…</p>;

  const { summary, positions, cashBalances, baseCurrency } = data;
  const netWorth = summary.totalMarketValueBase + summary.totalCashBase - summary.totalDebtBase;
  const currencyOptions = [...new Set(positions.map((p) => p.currencyCode))].sort();
  const openPositions = positions.filter((p) => {
    if (p.quantity === 0) return false;
    if (assetTypeFilter !== "ALL" && p.assetType !== assetTypeFilter) return false;
    if (currencyFilter !== "ALL" && p.currencyCode !== currencyFilter) return false;
    if (searchFilter.trim()) {
      const query = searchFilter.trim().toLowerCase();
      if (!`${p.ticker} ${p.name}`.toLowerCase().includes(query)) return false;
    }
    return true;
  });
  const closedPositions = positions.filter((p) => p.quantity === 0);

  const exportCsv = () => {
    const headers = [
      "Ticker",
      "Nombre",
      "Tipo",
      "Moneda",
      "Cantidad",
      "Precio actual",
      `Valor mercado (${showPurchaseCurrency ? "moneda de compra" : baseCurrency})`,
      `Retorno (${showPurchaseCurrency ? "moneda de compra" : baseCurrency})`,
      `Retorno % (${showPurchaseCurrency ? "sin efecto cambiario" : "con efecto cambiario"})`,
      "TRM promedio de compra",
      "TRM actual",
      "Costo histórico COP",
      "Valor actual COP",
      "Efecto dólar COP",
    ];
    const rows = openPositions.map((p) => [
      p.ticker,
      p.name,
      p.assetType,
      p.currencyCode,
      p.quantity,
      p.currentPriceLocal ?? "",
      (showPurchaseCurrency ? p.marketValueLocal : p.marketValueBase) ?? "",
      showPurchaseCurrency ? p.totalReturnLocal : p.totalReturnBase,
      (showPurchaseCurrency ? p.returnPctLocal : p.returnPct) ?? "",
      p.avgPurchaseTrm ?? "",
      p.currentTrmToCop ?? "",
      p.costBasisCop ?? "",
      p.marketValueCop ?? "",
      p.totalFxPnLCop ?? "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cartera-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    setPdfDownloading(true);
    try {
      const url = accountId ? `/api/portfolio/pdf?accountId=${accountId}` : "/api/portfolio/pdf";
      const res = await fetch(url);
      if (!res.ok) {
        setRefreshMsg("No se pudo generar el PDF.");
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `cartera-${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } finally {
      setPdfDownloading(false);
    }
  };

  const allocationByType = Object.entries(
    openPositions.reduce<Record<string, number>>((acc, p) => {
      const label = ASSET_TYPE_LABELS[p.assetType as keyof typeof ASSET_TYPE_LABELS] ?? p.assetType;
      acc[label] = (acc[label] ?? 0) + (p.marketValueBase ?? 0);
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Panel de cartera</h1>
          <p className="text-sm text-slate-500">
            {showPurchaseCurrency
              ? "Cada activo se muestra en la moneda en que fue comprado."
              : `Todo expresado en moneda base: ${baseCurrency}.`}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Cuenta</label>
              <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">Cartera completa (todas las cuentas)</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    Solo {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Mostrar importes en</label>
              <select
                className="input"
                value={moneyView}
                onChange={(e) => setMoneyView(e.target.value as MoneyView)}
              >
                <option value="PURCHASE">Moneda de compra (COP en COP, USD en USD)</option>
                <option value="BASE">Moneda base consolidada ({baseCurrency})</option>
              </select>
            </div>
            {accountId && (
              <p className="text-xs text-slate-500 sm:col-span-2">
                Costo promedio y ganancias calculados solo con las operaciones de esta cuenta — una misma acción
                comprada en varios brokers va a aparecer con un costo promedio distinto acá que en la vista completa.
              </p>
            )}
          </div>
          {summary.positionsMissingPrice > 0 && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {summary.positionsMissingPrice} posición(es) sin precio actual cargado — no se incluyen en el valor de
              mercado. Actualizalos con el botón o cargalos a mano en Activos.
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="flex flex-wrap justify-end gap-2">
            <button className="btn-secondary" onClick={exportCsv} disabled={openPositions.length === 0}>Exportar CSV</button>
            <button className="btn-secondary" onClick={downloadPdf} disabled={pdfDownloading}>
              {pdfDownloading ? "Generando PDF…" : "Descargar PDF"}
            </button>
            <button className="btn-secondary" onClick={refreshPrices} disabled={refreshing}>
              {refreshing ? "Actualizando…" : "Actualizar precios"}
            </button>
          </div>
          {refreshMsg && <p className="mt-1 max-w-xs text-xs text-slate-500">{refreshMsg}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SummaryCard label="Valor de mercado" value={formatMoney(summary.totalMarketValueBase, baseCurrency)} border="border-l-sky-500" />
        <SummaryCard
          label="Efectivo"
          value={formatMoney(summary.totalCashBase, baseCurrency)}
          border="border-l-sky-500"
        />
        <SummaryCard
          label="Deuda"
          value={formatMoney(summary.totalDebtBase, baseCurrency)}
          className={summary.totalDebtBase > 0 ? "loss-text" : undefined}
          border={summary.totalDebtBase > 0 ? "border-l-loss" : "border-l-slate-300"}
        />
        <SummaryCard label="Patrimonio neto" value={formatMoney(netWorth, baseCurrency)} border="border-l-indigo-500" />
        <SummaryCard
          label="Retorno total"
          value={formatMoney(summary.totalReturnBase, baseCurrency)}
          className={signClass(summary.totalReturnBase)}
          border={summary.totalReturnBase >= 0 ? "border-l-gain" : "border-l-loss"}
        />
      </div>

      <div className="card">
        <h2 className="mb-1 font-medium">Activos y rentabilidad por moneda de compra</h2>
        <p className="mb-4 text-sm text-slate-500">
          Los importes de monedas diferentes se mantienen separados. El porcentaje excluye el efecto de convertirlos a {baseCurrency}.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          {summary.returnByCurrency.map((currency) => (
            <div
              key={currency.currencyCode}
              className="rounded-xl border border-[#ded8ca] bg-[#fffdf8] p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-[#29352d]">{currency.currencyCode}</h3>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${signClass(currency.returnPct ?? 0)}`}
                >
                  {currency.returnPct != null ? formatPercent(currency.returnPct) : "—"}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                <Row label="Valor de mercado" value={formatMoney(currency.marketValueLocal, currency.currencyCode)} />
                <Row label="Costo abierto" value={formatMoney(currency.costBasisLocal, currency.currencyCode)} />
                <Row
                  label="Retorno total"
                  value={formatMoney(currency.totalReturnLocal, currency.currencyCode)}
                  valueClassName={signClass(currency.totalReturnLocal)}
                />
                <Row
                  label="No realizada"
                  value={formatMoney(currency.unrealizedPnLLocal, currency.currencyCode)}
                  valueClassName={signClass(currency.unrealizedPnLLocal)}
                />
                <Row
                  label="Realizada"
                  value={formatMoney(currency.realizedPnLLocal, currency.currencyCode)}
                  valueClassName={signClass(currency.realizedPnLLocal)}
                />
                <Row label="Dividendos" value={formatMoney(currency.dividendsLocal, currency.currencyCode)} />
              </dl>
            </div>
          ))}
        </div>
      </div>

      {summary.usdCopFx && (
        <div className="card border-l-4 border-l-[#b18a45]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-medium">Efecto del dólar frente al peso</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Compara la TRM de cada compra en USD con la TRM actual. Este resultado mide únicamente el movimiento
                del dólar; la ganancia o pérdida propia de las acciones permanece separada.
              </p>
            </div>
            {summary.usdCopFx.totalFxPnLCop != null && (
              <div className="text-right">
                <div className="text-xs text-slate-500">Efecto cambiario total</div>
                <div className={`text-2xl font-semibold ${signClass(summary.usdCopFx.totalFxPnLCop)}`}>
                  {formatMoney(summary.usdCopFx.totalFxPnLCop, "COP")}
                </div>
              </div>
            )}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 text-sm md:grid-cols-4">
            <Row
              label="TRM promedio de compra"
              value={summary.usdCopFx.avgPurchaseTrm != null ? formatTrm(summary.usdCopFx.avgPurchaseTrm) : "—"}
            />
            <Row
              label="TRM actual"
              value={summary.usdCopFx.currentTrmToCop != null ? formatTrm(summary.usdCopFx.currentTrmToCop) : "—"}
            />
            <Row label="Costo abierto en USD" value={formatMoney(summary.usdCopFx.openCostUsd, "USD")} />
            <Row
              label="Costo histórico en COP"
              value={summary.usdCopFx.openCostCop != null ? formatMoney(summary.usdCopFx.openCostCop, "COP") : "—"}
            />
            <Row
              label="Valor actual en COP"
              value={
                summary.usdCopFx.marketValueCop != null
                  ? formatMoney(summary.usdCopFx.marketValueCop, "COP")
                  : "—"
              }
            />
            <Row
              label="Efecto en posiciones abiertas"
              value={
                summary.usdCopFx.unrealizedFxPnLCop != null
                  ? formatMoney(summary.usdCopFx.unrealizedFxPnLCop, "COP")
                  : "—"
              }
              valueClassName={
                summary.usdCopFx.unrealizedFxPnLCop != null
                  ? signClass(summary.usdCopFx.unrealizedFxPnLCop)
                  : undefined
              }
            />
            <Row
              label="Efecto ya realizado"
              value={
                summary.usdCopFx.realizedFxPnLCop != null
                  ? formatMoney(summary.usdCopFx.realizedFxPnLCop, "COP")
                  : "—"
              }
              valueClassName={
                summary.usdCopFx.realizedFxPnLCop != null
                  ? signClass(summary.usdCopFx.realizedFxPnLCop)
                  : undefined
              }
            />
            <Row label="Posiciones USD evaluadas" value={String(summary.usdCopFx.usdPositions)} />
          </dl>

          <p className="mt-4 rounded-lg bg-[#f7f1e5] px-3 py-2 text-xs text-[#6d6048]">
            Fórmula de la posición abierta: costo USD vigente × (TRM actual − TRM promedio histórica).
          </p>

          {summary.usdCopFx.missingTrmPositions > 0 && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Faltan datos históricos de TRM para {summary.usdCopFx.missingTrmPositions} posición(es) en USD. Carga el
              período correspondiente en <a className="font-semibold underline" href="/tipos-de-cambio">Tipos de cambio</a>
              para completar el cálculo.
            </p>
          )}
        </div>
      )}

      {summary.totalDebtBase > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          La deuda se resta del patrimonio neto y se muestra por separado. No forma parte del costo promedio ni del
          precio de coste de las posiciones.
        </p>
      )}

      <div className="card">
        <h2 className="mb-3 font-medium">La verdadera rentabilidad: desempeño del activo vs. tipo de cambio</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Metric
            label="Retorno total"
            value={summary.totalReturnBase}
            baseCurrency={baseCurrency}
          />
          <Metric
            label="Por desempeño del activo"
            value={summary.totalReturnLocalPerformanceBase}
            baseCurrency={baseCurrency}
          />
          <Metric
            label="Por efecto del tipo de cambio"
            value={summary.totalReturnFxEffectBase}
            baseCurrency={baseCurrency}
          />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-600 sm:grid-cols-4">
          <Row label="Ganancia realizada" value={formatMoney(summary.totalRealizedBase, baseCurrency)} />
          <Row label="Ganancia no realizada" value={formatMoney(summary.totalUnrealizedBase, baseCurrency)} />
          <Row label="Dividendos e intereses" value={formatMoney(summary.totalDividendsBase, baseCurrency)} />
          <Row label="Comisiones / gastos" value={formatMoney(summary.totalFeesBase, baseCurrency)} />
        </dl>
        <div className="mt-4">
          <PerformanceBreakdownChart
            totalReturn={summary.totalReturnBase}
            localPerformance={summary.totalReturnLocalPerformanceBase}
            fxEffect={summary.totalReturnFxEffectBase}
            baseCurrency={baseCurrency}
          />
        </div>
      </div>

      <div className="card">
        <h2 className="mb-1 font-medium">Retorno %</h2>
        <p className="mb-3 text-sm text-slate-500">
          Sobre el capital total puesto en cada activo alguna vez (no solo lo que sigue invertido hoy).
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Metric
            label="Cartera completa"
            value={summary.totalReturnPct}
            baseCurrency=""
            format={(v) => formatPercent(v)}
          />
          {summary.returnByCurrency.map((c) => (
            <Metric
              key={c.currencyCode}
              label={`En ${c.currencyCode} (sin efecto cambiario)`}
              value={c.returnPct}
              baseCurrency=""
              format={(v) => formatPercent(v)}
            />
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-1 font-medium">Patrimonio neto en el tiempo</h2>
        <p className="mb-3 text-sm text-slate-500">
          Mercado + efectivo − deuda, todas las cuentas juntas. Se guarda una foto por día.
        </p>
        <NetWorthHistoryChart data={netWorthHistory} baseCurrency={baseCurrency} />
      </div>

      <div className="card">
        <h2 className="mb-1 font-medium">Composición de la cartera</h2>
        <p className="mb-3 text-sm text-slate-500">Valor de mercado de las posiciones abiertas, por tipo de activo.</p>
        <AllocationDonut data={allocationByType} baseCurrency={baseCurrency} />
      </div>

      <div className="card overflow-x-auto">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium">Posiciones abiertas</h2>
          <div className="flex flex-wrap gap-2">
            <input className="input w-44" placeholder="Buscar activo…" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} aria-label="Buscar activo" />
            <select className="input w-auto" value={assetTypeFilter} onChange={(e) => setAssetTypeFilter(e.target.value)} aria-label="Filtrar por tipo">
              <option value="ALL">Todos los tipos</option>
              {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select
              className="input w-auto"
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              aria-label="Filtrar por moneda"
            >
              <option value="ALL">Todas las monedas</option>
              {currencyOptions.map((currency) => (
                <option key={currency} value={currency}>
                  Solo {currency}
                </option>
              ))}
            </select>
            <ColumnPicker columns={columns} visible={visibleColumns} onToggle={toggleColumn} />
          </div>
        </div>
        {openPositions.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no tenés posiciones abiertas.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                {shownColumns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {openPositions.map((p) => (
                <tr key={p.assetId}>
                  {shownColumns.map((c) => (
                    <td key={c.key}>{c.render(p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {closedPositions.length > 0 && (
        <details className="card overflow-x-auto">
          <summary className="cursor-pointer font-medium">Posiciones cerradas ({closedPositions.length})</summary>
          <table className="table-base mt-3">
            <thead>
              <tr>
                {shownColumns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {closedPositions.map((p) => (
                <tr key={p.assetId}>
                  {shownColumns.map((c) => (
                    <td key={c.key}>{c.render(p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      <div className="card overflow-x-auto">
        <h2 className="mb-3 font-medium">Saldos de efectivo</h2>
        {cashBalances.length === 0 ? (
          <p className="text-sm text-slate-500">Sin movimientos de efectivo todavía.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Moneda</th>
                <th>Saldo</th>
                <th>Equivalente en {baseCurrency}</th>
              </tr>
            </thead>
            <tbody>
              {cashBalances.map((c) => (
                <tr key={c.currencyCode}>
                  <td>{c.currencyCode}</td>
                  <td>{formatMoney(c.balance, c.currencyCode)}</td>
                  <td>{c.balanceBase != null ? formatMoney(c.balanceBase, baseCurrency) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  className,
  border,
}: {
  label: string;
  value: string;
  className?: string;
  border?: string;
}) {
  return (
    <div className={`stat-card ${border ?? "border-l-slate-300"}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${className ?? ""}`}>{value}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  baseCurrency,
  format,
}: {
  label: string;
  value: number | null;
  baseCurrency: string;
  format?: (value: number) => string;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-semibold ${value != null ? signClass(value) : ""}`}>
        {value == null ? "—" : format ? format(value) : formatMoney(value, baseCurrency)}
      </div>
    </div>
  );
}

function Row({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div>
      <dt className="text-xs">{label}</dt>
      <dd className={`font-medium ${valueClassName ?? "text-slate-900"}`}>{value}</dd>
    </div>
  );
}

function formatTrm(value: number): string {
  return `COP ${new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} / USD`;
}
