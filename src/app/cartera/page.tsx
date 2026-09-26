"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney, formatPercent, signClass } from "@/lib/format";
import { ASSET_TYPE_LABELS } from "@/lib/enums";
import { AllocationDonut } from "@/components/charts/AllocationDonut";
import { PerformanceBreakdownChart } from "@/components/charts/PerformanceBreakdownChart";
import { NetWorthHistoryChart, type NetWorthPoint } from "@/components/charts/NetWorthHistoryChart";
import { AssetReturnsChart } from "@/components/charts/AssetReturnsChart";
import { ColumnPicker, useVisibleColumns, type ColumnDef } from "@/components/ColumnPicker";
import { SortableTh, useSortState } from "@/components/SortableTh";
import { sortRows } from "@/lib/sortRows";
import { xirr } from "@/lib/portfolio";

interface PositionCashFlowDto {
  date: string;
  amount: number;
  isTerminal: boolean;
}

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
  priceAsOf: string | null;
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
  cashFlowsUsd: PositionCashFlowDto[] | null;
  cashFlowsCop: PositionCashFlowDto[] | null;
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
  currentTrmToCop: number | null;
  positions: PositionDto[];
  cashBalances: CashBalanceDto[];
  summary: SummaryDto;
}

interface AccountDto {
  id: string;
  name: string;
}

type MoneyView = "PURCHASE" | "USD" | "COP";

export default function DashboardPage() {
  const [data, setData] = useState<PortfolioDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string> | null>(null);
  const [assetTypeFilter, setAssetTypeFilter] = useState("ALL");
  const [currencyFilter, setCurrencyFilter] = useState("ALL");
  const [searchFilter, setSearchFilter] = useState("");
  const [moneyView, setMoneyView] = useState<MoneyView>("USD");
  const [netWorthHistory, setNetWorthHistory] = useState<NetWorthPoint[]>([]);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  const load = (scopeAccountIds: string[]) => {
    const query = scopeAccountIds.length > 0
      ? `?accountIds=${encodeURIComponent(scopeAccountIds.join(","))}`
      : "";
    return fetch(`/api/portfolio${query}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("No se pudo cargar la cartera."));
  };

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then(setAccounts);
    fetch("/api/net-worth-history")
      .then((r) => r.json())
      .then(setNetWorthHistory);
  }, []);

  useEffect(() => {
    load(selectedAccountIds);
  }, [selectedAccountIds]);

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
      await load(selectedAccountIds);
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
  const currentTrmForColumns = data?.currentTrmToCop ?? null;
  const showPurchaseCurrency = moneyView === "PURCHASE";
  const consolidatedCurrency = moneyView === "COP" ? "COP" : "USD";
  const selectedMarketForColumns = (data?.positions ?? [])
    .filter((position) => {
      if (position.quantity === 0) return false;
      if (assetTypeFilter !== "ALL" && position.assetType !== assetTypeFilter) return false;
      if (currencyFilter !== "ALL" && position.currencyCode !== currencyFilter) return false;
      if (searchFilter.trim() && !`${position.ticker} ${position.name}`.toLowerCase().includes(searchFilter.trim().toLowerCase())) return false;
      return selectedAssetIds == null || selectedAssetIds.has(position.assetId);
    })
    .reduce(
      (sum, position) =>
        sum +
        (convertLocalAmount(
          position.marketValueLocal,
          position.currencyCode,
          consolidatedCurrency,
          currentTrmForColumns,
        ) ?? 0),
      0,
    );

  const columns = useMemo<ColumnDef<PositionDto>[]>(() => {
    // Monto en la moneda que se está mostrando: la de compra, o USD/COP
    // consolidado. Es el mismo número que muestran las celdas, para ordenar.
    const shownAmount = (value: number | null, p: PositionDto) =>
      showPurchaseCurrency
        ? value
        : convertLocalAmount(value, p.currencyCode, consolidatedCurrency, currentTrmForColumns);
    return [
      {
        key: "activo",
        label: "Activo",
        defaultVisible: true,
        sortValue: (p) => p.ticker,
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
        sortValue: (p) => ASSET_TYPE_LABELS[p.assetType as keyof typeof ASSET_TYPE_LABELS] ?? p.assetType,
        render: (p) => ASSET_TYPE_LABELS[p.assetType as keyof typeof ASSET_TYPE_LABELS] ?? p.assetType,
      },
      {
        key: "cantidad",
        label: "Cantidad",
        defaultVisible: true,
        sortValue: (p) => (p.quantity !== 0 ? p.quantity : null),
        render: (p) => (p.quantity !== 0 ? p.quantity : "—"),
      },
      {
        key: "peso",
        label: "% Cartera",
        defaultVisible: true,
        sortValue: (p) => convertLocalAmount(p.marketValueLocal, p.currencyCode, consolidatedCurrency, currentTrmForColumns),
        render: (p) => {
          const value = convertLocalAmount(
            p.marketValueLocal,
            p.currencyCode,
            consolidatedCurrency,
            currentTrmForColumns,
          );
          return value != null && selectedMarketForColumns > 0
            ? formatPercent(value / selectedMarketForColumns)
            : "—";
        },
      },
      {
        key: "costoProm",
        label: "Costo prom.",
        defaultVisible: true,
        sortValue: (p) => (p.quantity !== 0 ? shownAmount(p.avgCostLocal, p) : null),
        render: (p) => {
          const value = showPurchaseCurrency
            ? p.avgCostLocal
            : convertLocalAmount(p.avgCostLocal, p.currencyCode, consolidatedCurrency, currentTrmForColumns);
          return p.quantity !== 0 && value != null
            ? formatMoney(value, showPurchaseCurrency ? p.currencyCode : consolidatedCurrency)
            : "—";
        },
      },
      {
        key: "precioActual",
        label: "Último precio",
        defaultVisible: true,
        sortValue: (p) => shownAmount(p.currentPriceLocal, p),
        render: (p) => {
          const value = showPurchaseCurrency
            ? p.currentPriceLocal
            : convertLocalAmount(p.currentPriceLocal, p.currencyCode, consolidatedCurrency, currentTrmForColumns);
          return value != null ? formatMoney(value, showPurchaseCurrency ? p.currencyCode : consolidatedCurrency) : "—";
        },
      },
      {
        key: "fechaPrecio",
        label: "Fecha precio",
        defaultVisible: true,
        sortValue: (p) => p.priceAsOf,
        render: (p) => p.priceAsOf?.slice(0, 10) ?? "Sin fecha",
      },
      {
        key: "valorMercado",
        label: "Valor mercado",
        defaultVisible: true,
        sortValue: (p) => shownAmount(p.marketValueLocal, p),
        render: (p) => {
          const value = showPurchaseCurrency
            ? p.marketValueLocal
            : convertLocalAmount(p.marketValueLocal, p.currencyCode, consolidatedCurrency, currentTrmForColumns);
          return value != null
            ? formatMoney(value, showPurchaseCurrency ? p.currencyCode : consolidatedCurrency)
            : "—";
        },
      },
      {
        key: "noRealizada",
        label: "No realizada",
        defaultVisible: true,
        sortValue: (p) => shownAmount(p.unrealizedPnLLocal, p),
        render: (p) => {
          const value = showPurchaseCurrency
            ? p.unrealizedPnLLocal
            : convertLocalAmount(p.unrealizedPnLLocal, p.currencyCode, consolidatedCurrency, currentTrmForColumns);
          return value != null ? (
            <span className={value != null ? signClass(value) : ""}>
              {formatMoney(value, showPurchaseCurrency ? p.currencyCode : consolidatedCurrency)}
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
        sortValue: (p) => shownAmount(p.realizedPnLLocal, p),
        render: (p) => {
          const value = showPurchaseCurrency
            ? p.realizedPnLLocal
            : convertLocalAmount(p.realizedPnLLocal, p.currencyCode, consolidatedCurrency, currentTrmForColumns);
          return (
            <span className={value != null ? signClass(value) : ""}>
              {value != null ? formatMoney(value, showPurchaseCurrency ? p.currencyCode : consolidatedCurrency) : "—"}
            </span>
          );
        },
      },
      {
        key: "dividendos",
        label: "Dividendos",
        defaultVisible: true,
        sortValue: (p) => shownAmount(p.dividendsLocal, p),
        render: (p) =>
          formatMoney(
            showPurchaseCurrency
              ? p.dividendsLocal
              : (convertLocalAmount(p.dividendsLocal, p.currencyCode, consolidatedCurrency, currentTrmForColumns) ?? 0),
            showPurchaseCurrency ? p.currencyCode : consolidatedCurrency,
          ),
      },
      {
        key: "comisiones",
        label: "Comisiones",
        defaultVisible: true,
        sortValue: (p) => shownAmount(p.feesLocal, p),
        render: (p) =>
          formatMoney(
            showPurchaseCurrency
              ? p.feesLocal
              : (convertLocalAmount(p.feesLocal, p.currencyCode, consolidatedCurrency, currentTrmForColumns) ?? 0),
            showPurchaseCurrency ? p.currencyCode : consolidatedCurrency,
          ),
      },
      {
        key: "retornoTotal",
        label: "Retorno total",
        defaultVisible: true,
        sortValue: (p) => (showPurchaseCurrency ? p.totalReturnLocal : flowReturnStats(p, consolidatedCurrency).amount),
        render: (p) => {
          const value = showPurchaseCurrency ? p.totalReturnLocal : flowReturnStats(p, consolidatedCurrency).amount;
          return (
            <span className={value != null ? signClass(value) : ""}>
              {value != null ? formatMoney(value, showPurchaseCurrency ? p.currencyCode : consolidatedCurrency) : "—"}
            </span>
          );
        },
      },
      {
        key: "retornoPct",
        label: "Retorno %",
        defaultVisible: true,
        sortValue: (p) => (showPurchaseCurrency ? p.returnPctLocal : flowReturnStats(p, consolidatedCurrency).pct),
        render: (p) => {
          const value = showPurchaseCurrency ? p.returnPctLocal : flowReturnStats(p, consolidatedCurrency).pct;
          return value != null ? <span className={signClass(value)}>{formatPercent(value)}</span> : "—";
        },
      },
      {
        key: "retornoAnual",
        label: "Rentabilidad anual",
        defaultVisible: true,
        sortValue: (p) =>
          showPurchaseCurrency || (p.currencyCode !== "USD" && p.currencyCode !== "COP")
            ? null
            : flowReturnStats(p, consolidatedCurrency).annualized,
        render: (p) => {
          if (showPurchaseCurrency || (p.currencyCode !== "USD" && p.currencyCode !== "COP")) return "—";
          const value = flowReturnStats(p, consolidatedCurrency).annualized;
          return value != null ? <span className={signClass(value)}>{formatPercent(value)}</span> : "—";
        },
      },
      {
        key: "trmCompra",
        label: "TRM compra",
        defaultVisible: true,
        sortValue: (p) => (p.currencyCode === "USD" ? p.avgPurchaseTrm : null),
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
        defaultVisible: true,
        sortValue: (p) => (p.currencyCode === "USD" ? p.marketValueCop : null),
        render: (p) =>
          p.currencyCode === "USD" && p.marketValueCop != null
            ? formatMoney(p.marketValueCop, "COP")
            : "—",
      },
      {
        key: "efectoDolarCop",
        label: "Efecto dólar COP",
        defaultVisible: true,
        sortValue: (p) => (p.currencyCode === "USD" ? p.totalFxPnLCop : null),
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
        sortValue: (p) =>
          showPurchaseCurrency
            ? null
            : convertLocalAmount(p.totalReturnLocal, p.currencyCode, consolidatedCurrency, currentTrmForColumns),
        render: (p) =>
          showPurchaseCurrency ? (
            <span className="text-xs text-slate-500">
              {p.currencyCode} · sin conversión
            </span>
          ) : (
            (() => {
              const total = flowReturnStats(p, consolidatedCurrency).amount;
              const local = convertLocalAmount(
                p.totalReturnLocal,
                p.currencyCode,
                consolidatedCurrency,
                currentTrmForColumns,
              );
              const fx = total != null && local != null ? total - local : null;
              return (
                <span className="text-xs">
                  <span className={local != null ? signClass(local) : ""}>
                    Activo: {local != null ? formatMoney(local, consolidatedCurrency) : "—"}
                  </span>
                  <br />
                  <span className={fx != null ? signClass(fx) : ""}>
                    FX: {fx != null ? formatMoney(fx, consolidatedCurrency) : "—"}
                  </span>
                </span>
              );
            })()
          ),
      },
    ];
  }, [consolidatedCurrency, currentTrmForColumns, selectedMarketForColumns, showPurchaseCurrency]);
  const [visibleColumns, toggleColumn, showAllColumns] = useVisibleColumns("cartera:columnas-posiciones", columns);
  const shownColumns = columns.filter((c) => visibleColumns.has(c.key));
  const [sort, toggleSort] = useSortState("cartera:orden-posiciones");
  const sortColumn = sort ? columns.find((c) => c.key === sort.key && c.sortValue) : undefined;
  const sortPositions = (list: PositionDto[]) =>
    sort && sortColumn?.sortValue ? sortRows(list, sortColumn.sortValue, sort.direction) : list;
  const headerFor = (c: ColumnDef<PositionDto>) =>
    c.sortValue ? (
      <SortableTh
        key={c.key}
        label={c.label}
        columnKey={c.key}
        sort={sort}
        firstDirection={c.key === "activo" || c.key === "tipo" ? "asc" : "desc"}
        onSort={toggleSort}
      />
    ) : (
      <th key={c.key}>{c.label}</th>
    );

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
  const openPositionGroups = [
    { currencyCode: "COP", label: "Inversiones en pesos (COP)", positions: openPositions.filter((p) => p.currencyCode === "COP") },
    { currencyCode: "USD", label: "Inversiones en dólares (USD)", positions: openPositions.filter((p) => p.currencyCode === "USD") },
    ...currencyOptions
      .filter((currency) => currency !== "COP" && currency !== "USD")
      .map((currency) => ({
        currencyCode: currency,
        label: `Inversiones en ${currency}`,
        positions: openPositions.filter((p) => p.currencyCode === currency),
      })),
  ];
  const selectedPositions = openPositions.filter(
    (position) => selectedAssetIds == null || selectedAssetIds.has(position.assetId),
  );
  const closedPositions = positions.filter((p) => p.quantity === 0);
  const selectedCurrency = moneyView === "COP" ? "COP" : "USD";
  const selectedFlowsComplete = selectedPositions.every(
    (position) => flowsForCurrency(position, selectedCurrency) != null,
  );
  const selectedFlows = selectedFlowsComplete
    ? selectedPositions.flatMap((position) => flowsForCurrency(position, selectedCurrency) ?? [])
    : [];
  const selectedReturn = selectedFlowsComplete
    ? selectedFlows.reduce((sum, flow) => sum + flow.amount, 0)
    : null;
  const selectedInvested = selectedFlowsComplete
    ? -selectedFlows
        .filter((flow) => !flow.isTerminal && flow.amount < 0)
        .reduce((sum, flow) => sum + flow.amount, 0)
    : null;
  const selectedReturnPct =
    selectedReturn != null && selectedInvested != null && selectedInvested > 0
      ? selectedReturn / selectedInvested
      : null;
  const selectedAnnualizedReturn = selectedFlowsComplete
    ? xirr(selectedFlows.map((flow) => ({ date: new Date(flow.date), amount: flow.amount })))
    : null;
  const selectedMarketValue = selectedPositions.reduce(
    (sum, position) =>
      sum +
      (convertLocalAmount(
        position.marketValueLocal,
        position.currencyCode,
        selectedCurrency,
        data.currentTrmToCop,
      ) ?? 0),
    0,
  );
  const selectedLocalPerformance = selectedPositions.reduce(
    (sum, position) =>
      sum +
      (convertLocalAmount(
        position.totalReturnLocal,
        position.currencyCode,
        selectedCurrency,
        data.currentTrmToCop,
      ) ?? 0),
    0,
  );
  const selectedFxEffect = selectedReturn != null ? selectedReturn - selectedLocalPerformance : null;
  const selectedAssetReturns = selectedPositions.map((position) => {
    const stats = flowReturnStats(position, selectedCurrency);
    return {
      ticker: position.ticker,
      totalReturnPct: stats.pct,
      annualizedReturn: stats.annualized,
    };
  });
  const selectedUsdPositions = selectedPositions.filter((position) => position.currencyCode === "USD");
  const selectedOpenCostUsd = selectedUsdPositions.reduce((sum, position) => sum + position.costBasisLocal, 0);
  const selectedOpenCostCopKnown = selectedUsdPositions.every((position) => position.costBasisCop != null);
  const selectedMarketCopKnown = selectedUsdPositions.every((position) => position.marketValueCop != null);
  const selectedUnrealizedFxKnown = selectedUsdPositions.every((position) => position.unrealizedFxPnLCop != null);
  const selectedRealizedFxKnown = selectedUsdPositions.every((position) => position.realizedFxPnLCop != null);
  const selectedOpenCostCop = selectedOpenCostCopKnown
    ? selectedUsdPositions.reduce((sum, position) => sum + (position.costBasisCop ?? 0), 0)
    : null;
  const selectedUnrealizedFx = selectedUnrealizedFxKnown
    ? selectedUsdPositions.reduce((sum, position) => sum + (position.unrealizedFxPnLCop ?? 0), 0)
    : null;
  const selectedRealizedFx = selectedRealizedFxKnown
    ? selectedUsdPositions.reduce((sum, position) => sum + (position.realizedFxPnLCop ?? 0), 0)
    : null;
  const selectedUsdCopFx: UsdCopFxSummaryDto | null = selectedUsdPositions.length === 0
    ? null
    : {
        currentTrmToCop: data.currentTrmToCop,
        avgPurchaseTrm:
          selectedOpenCostCop != null && selectedOpenCostUsd > 0
            ? selectedOpenCostCop / selectedOpenCostUsd
            : null,
        openCostUsd: selectedOpenCostUsd,
        openCostCop: selectedOpenCostCop,
        marketValueCop: selectedMarketCopKnown
          ? selectedUsdPositions.reduce((sum, position) => sum + (position.marketValueCop ?? 0), 0)
          : null,
        unrealizedFxPnLCop: selectedUnrealizedFx,
        realizedFxPnLCop: selectedRealizedFx,
        totalFxPnLCop:
          selectedUnrealizedFx != null && selectedRealizedFx != null
            ? selectedUnrealizedFx + selectedRealizedFx
            : null,
        usdPositions: selectedUsdPositions.length,
        missingTrmPositions: selectedUsdPositions.filter((position) => !position.trmCoverageComplete).length,
      };

  const toggleAccount = (accountToToggle: string) => {
    const current = selectedAccountIds.length === 0 ? accounts.map((account) => account.id) : selectedAccountIds;
    const next = current.includes(accountToToggle)
      ? current.filter((id) => id !== accountToToggle)
      : [...current, accountToToggle];
    setSelectedAssetIds(null);
    setSelectedAccountIds(next.length === accounts.length ? [] : next);
  };

  const toggleAsset = (assetId: string) => {
    const current = selectedAssetIds == null
      ? new Set(positions.filter((position) => position.quantity !== 0).map((position) => position.assetId))
      : new Set(selectedAssetIds);
    if (current.has(assetId)) current.delete(assetId);
    else current.add(assetId);
    setSelectedAssetIds(current);
  };

  const exportCsv = () => {
    const headers = [
      "Ticker",
      "Nombre",
      "Tipo",
      "Moneda",
      "Cantidad",
      "Precio actual",
      "Fecha precio",
      `Valor mercado (${showPurchaseCurrency ? "moneda de compra" : selectedCurrency})`,
      `Retorno (${showPurchaseCurrency ? "moneda de compra" : selectedCurrency})`,
      `Retorno % (${showPurchaseCurrency ? "sin efecto cambiario" : "con efecto cambiario"})`,
      "Rentabilidad anualizada",
      "TRM promedio de compra",
      "TRM actual",
      "Costo histórico COP",
      "Valor actual COP",
      "Efecto dólar COP",
    ];
    const rows = selectedPositions.map((p) => [
      p.ticker,
      p.name,
      p.assetType,
      p.currencyCode,
      p.quantity,
      p.currentPriceLocal ?? "",
      p.priceAsOf?.slice(0, 10) ?? "",
      (showPurchaseCurrency
        ? p.marketValueLocal
        : convertLocalAmount(p.marketValueLocal, p.currencyCode, selectedCurrency, data.currentTrmToCop)) ?? "",
      (showPurchaseCurrency ? p.totalReturnLocal : flowReturnStats(p, selectedCurrency).amount) ?? "",
      (showPurchaseCurrency ? p.returnPctLocal : flowReturnStats(p, selectedCurrency).pct) ?? "",
      showPurchaseCurrency ? "" : (flowReturnStats(p, selectedCurrency).annualized ?? ""),
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
      const query = selectedAccountIds.length > 0
        ? `?accountIds=${encodeURIComponent(selectedAccountIds.join(","))}`
        : "";
      const url = `/api/portfolio/pdf${query}`;
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
    selectedPositions.reduce<Record<string, number>>((acc, p) => {
      const label = ASSET_TYPE_LABELS[p.assetType as keyof typeof ASSET_TYPE_LABELS] ?? p.assetType;
      acc[label] =
        (acc[label] ?? 0) +
        (convertLocalAmount(p.marketValueLocal, p.currencyCode, selectedCurrency, data.currentTrmToCop) ?? 0);
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="portfolio-dashboard space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Panel de cartera</h1>
          <p className="text-sm text-slate-500">
            {showPurchaseCurrency
              ? "Cada activo se muestra en la moneda en que fue comprado."
              : `Todo el grupo seleccionado se muestra en ${selectedCurrency}.`}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Brókers / cuentas</label>
              <details className="relative">
                <summary className="input cursor-pointer list-none">
                  {selectedAccountIds.length === 0
                    ? "Todos los brókers"
                    : `${selectedAccountIds.length} bróker(es) seleccionado(s)`}
                </summary>
                <div className="absolute z-20 mt-1 min-w-full rounded-xl border border-[#ded8ca] bg-white p-3 shadow-lg">
                  <button
                    className="mb-2 text-xs font-semibold text-[#765c2b] underline"
                    onClick={() => {
                      setSelectedAssetIds(null);
                      setSelectedAccountIds([]);
                    }}
                  >
                    Seleccionar todos
                  </button>
                  <div className="space-y-2">
                    {accounts.map((account) => (
                      <label key={account.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedAccountIds.length === 0 || selectedAccountIds.includes(account.id)}
                          onChange={() => toggleAccount(account.id)}
                        />
                        {account.name}
                      </label>
                    ))}
                  </div>
                </div>
              </details>
            </div>
            <div>
              <label className="label">Mostrar importes en</label>
              <select
                className="input"
                value={moneyView}
                onChange={(e) => setMoneyView(e.target.value as MoneyView)}
              >
                <option value="PURCHASE">Moneda de compra (COP en COP, USD en USD)</option>
                <option value="USD">Todo consolidado en USD</option>
                <option value="COP">Todo consolidado en COP</option>
              </select>
            </div>
            {selectedAccountIds.length > 0 && (
              <p className="text-xs text-slate-500 sm:col-span-2">
                Costo promedio y ganancias calculados únicamente con las operaciones de los brókers seleccionados.
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
            <button className="btn-secondary" onClick={exportCsv} disabled={selectedPositions.length === 0}>Exportar CSV</button>
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

      <div className="card border-l-4 border-l-[#167c5a]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-medium">Resultado de la selección</h2>
            <p className="text-sm text-slate-500">
              {selectedPositions.length} activo(s) · {selectedCurrency} · cambia al seleccionar activos, moneda o brókers.
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setSelectedAssetIds(null)}>Todos los visibles</button>
            <button className="btn-secondary" onClick={() => setSelectedAssetIds(new Set())}>Limpiar selección</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <SummaryCard label="Valor actual" value={formatMoney(selectedMarketValue, selectedCurrency)} border="border-l-sky-500" />
          <SummaryCard
            label="Capital invertido"
            value={selectedInvested != null ? formatMoney(selectedInvested, selectedCurrency) : "—"}
            border="border-l-sky-500"
          />
          <SummaryCard
            label="Rentabilidad total"
            value={selectedReturn != null ? formatMoney(selectedReturn, selectedCurrency) : "—"}
            className={selectedReturn != null ? signClass(selectedReturn) : undefined}
            border={selectedReturn != null && selectedReturn >= 0 ? "border-l-gain" : "border-l-loss"}
          />
          <SummaryCard
            label="Rentabilidad total %"
            value={selectedReturnPct != null ? formatPercent(selectedReturnPct) : "—"}
            className={selectedReturnPct != null ? signClass(selectedReturnPct) : undefined}
            border={selectedReturnPct != null && selectedReturnPct >= 0 ? "border-l-gain" : "border-l-loss"}
          />
          <SummaryCard
            label="Rentabilidad anual (XIRR)"
            value={selectedAnnualizedReturn != null ? formatPercent(selectedAnnualizedReturn) : "—"}
            className={selectedAnnualizedReturn != null ? signClass(selectedAnnualizedReturn) : undefined}
            border={selectedAnnualizedReturn != null && selectedAnnualizedReturn >= 0 ? "border-l-gain" : "border-l-loss"}
          />
        </div>
        {!selectedFlowsComplete && selectedPositions.length > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Falta TRM histórica para convertir todos los flujos seleccionados a {selectedCurrency}; la rentabilidad
            total y anual aparecerán al completar ese historial.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Cartera total" value={formatMoney(summary.totalMarketValueBase, baseCurrency)} border="border-l-sky-500" />
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

      {selectedUsdCopFx && (
        <div className="card border-l-4 border-l-[#b18a45]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-medium">Efecto del dólar frente al peso</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Compara la TRM de cada compra en USD con la TRM actual. Este resultado mide únicamente el movimiento
                del dólar; la ganancia o pérdida propia de las acciones permanece separada.
              </p>
            </div>
            {selectedUsdCopFx.totalFxPnLCop != null && (
              <div className="text-right">
                <div className="text-xs text-slate-500">Efecto cambiario total</div>
                <div className={`text-2xl font-semibold ${signClass(selectedUsdCopFx.totalFxPnLCop)}`}>
                  {formatMoney(selectedUsdCopFx.totalFxPnLCop, "COP")}
                </div>
              </div>
            )}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 text-sm md:grid-cols-4">
            <Row
              label="TRM promedio de compra"
              value={selectedUsdCopFx.avgPurchaseTrm != null ? formatTrm(selectedUsdCopFx.avgPurchaseTrm) : "—"}
            />
            <Row
              label="TRM actual"
              value={selectedUsdCopFx.currentTrmToCop != null ? formatTrm(selectedUsdCopFx.currentTrmToCop) : "—"}
            />
            <Row label="Costo abierto en USD" value={formatMoney(selectedUsdCopFx.openCostUsd, "USD")} />
            <Row
              label="Costo histórico en COP"
              value={selectedUsdCopFx.openCostCop != null ? formatMoney(selectedUsdCopFx.openCostCop, "COP") : "—"}
            />
            <Row
              label="Valor actual en COP"
              value={
                selectedUsdCopFx.marketValueCop != null
                  ? formatMoney(selectedUsdCopFx.marketValueCop, "COP")
                  : "—"
              }
            />
            <Row
              label="Efecto en posiciones abiertas"
              value={
                selectedUsdCopFx.unrealizedFxPnLCop != null
                  ? formatMoney(selectedUsdCopFx.unrealizedFxPnLCop, "COP")
                  : "—"
              }
              valueClassName={
                selectedUsdCopFx.unrealizedFxPnLCop != null
                  ? signClass(selectedUsdCopFx.unrealizedFxPnLCop)
                  : undefined
              }
            />
            <Row
              label="Efecto ya realizado"
              value={
                selectedUsdCopFx.realizedFxPnLCop != null
                  ? formatMoney(selectedUsdCopFx.realizedFxPnLCop, "COP")
                  : "—"
              }
              valueClassName={
                selectedUsdCopFx.realizedFxPnLCop != null
                  ? signClass(selectedUsdCopFx.realizedFxPnLCop)
                  : undefined
              }
            />
            <Row label="Posiciones USD evaluadas" value={String(selectedUsdCopFx.usdPositions)} />
          </dl>

          <p className="mt-4 rounded-lg bg-[#f7f1e5] px-3 py-2 text-xs text-[#6d6048]">
            Fórmula de la posición abierta: costo USD vigente × (TRM actual − TRM promedio histórica).
          </p>

          {selectedUsdCopFx.missingTrmPositions > 0 && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Faltan datos históricos de TRM para {selectedUsdCopFx.missingTrmPositions} posición(es) en USD. Carga el
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
        <h2 className="mb-1 font-medium">Rentabilidad de la selección: activo vs. tipo de cambio</h2>
        <p className="mb-3 text-sm text-slate-500">
          El efecto cambiario surge de convertir cada flujo con la TRM de su fecha y valorar hoy con la TRM actual.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Metric
            label="Retorno total"
            value={selectedReturn}
            baseCurrency={selectedCurrency}
          />
          <Metric
            label="Por desempeño del activo"
            value={selectedReturn != null ? selectedLocalPerformance : null}
            baseCurrency={selectedCurrency}
          />
          <Metric
            label="Por efecto del tipo de cambio"
            value={selectedFxEffect}
            baseCurrency={selectedCurrency}
          />
        </div>
        <div className="mt-4">
          <PerformanceBreakdownChart
            totalReturn={selectedReturn ?? 0}
            localPerformance={selectedReturn != null ? selectedLocalPerformance : 0}
            fxEffect={selectedFxEffect ?? 0}
            baseCurrency={selectedCurrency}
          />
        </div>
      </div>

      <div className="card">
        <h2 className="mb-1 font-medium">Rentabilidad por activo seleccionado</h2>
        <p className="mb-3 text-sm text-slate-500">
          Las barras muestran la rentabilidad total; al pasar sobre ellas también aparece la rentabilidad anualizada.
        </p>
        <AssetReturnsChart data={selectedAssetReturns} />
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
        <p className="mb-3 text-sm text-slate-500">Valor de mercado de la selección, por tipo de activo.</p>
        <AllocationDonut data={allocationByType} baseCurrency={selectedCurrency} />
      </div>

      <div className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">Posiciones abiertas</h2>
            <p className="text-xs text-slate-500">Separadas por moneda. Marca cada activo para incluirlo en cálculos y gráficas.</p>
          </div>
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
            <ColumnPicker columns={columns} visible={visibleColumns} onToggle={toggleColumn} onShowAll={showAllColumns} />
          </div>
        </div>
        <div className="space-y-6">
          {openPositionGroups.map((group) => (
            <section key={group.currencyCode} aria-label={group.label}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-[#314a35]">{group.label}</h3>
                <span className="text-xs text-slate-500">{group.positions.length} activo(s)</span>
              </div>
              {group.positions.length === 0 ? (
                <p className="rounded-lg border border-[#eadfce] px-3 py-3 text-sm text-slate-500">
                  Sin posiciones abiertas con los filtros actuales.
                </p>
              ) : (
                <div className="overflow-x-auto overscroll-x-contain rounded-lg border border-[#eadfce]">
                  <table className="table-base portfolio-positions-table">
                    <thead>
                      <tr>
                        <th>Incluir</th>
                        {shownColumns.map(headerFor)}
                      </tr>
                    </thead>
                    <tbody>
                      {sortPositions(group.positions).map((p) => (
                        <tr key={p.assetId}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedAssetIds == null || selectedAssetIds.has(p.assetId)}
                              onChange={() => toggleAsset(p.assetId)}
                              aria-label={`Incluir ${p.ticker} en la selección`}
                            />
                          </td>
                          {shownColumns.map((c) => (
                            <td key={c.key}>{c.render(p)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>

      {closedPositions.length > 0 && (
        <details className="card overflow-x-auto">
          <summary className="cursor-pointer font-medium">Posiciones cerradas ({closedPositions.length})</summary>
          <table className="table-base mt-3">
            <thead>
              <tr>{shownColumns.map(headerFor)}</tr>
            </thead>
            <tbody>
              {sortPositions(closedPositions).map((p) => (
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

function flowsForCurrency(position: PositionDto, currency: "USD" | "COP"): PositionCashFlowDto[] | null {
  return currency === "USD" ? position.cashFlowsUsd : position.cashFlowsCop;
}

function flowReturnStats(position: PositionDto, currency: "USD" | "COP") {
  const flows = flowsForCurrency(position, currency);
  if (!flows || flows.length === 0) return { amount: null, invested: null, pct: null, annualized: null };
  const amount = flows.reduce((sum, flow) => sum + flow.amount, 0);
  const invested = -flows
    .filter((flow) => !flow.isTerminal && flow.amount < 0)
    .reduce((sum, flow) => sum + flow.amount, 0);
  const annualized = xirr(flows.map((flow) => ({ date: new Date(flow.date), amount: flow.amount })));
  return {
    amount,
    invested,
    pct: invested > 0 ? amount / invested : null,
    annualized,
  };
}

function convertLocalAmount(
  value: number | null,
  sourceCurrency: string,
  targetCurrency: "USD" | "COP",
  currentTrmToCop: number | null,
): number | null {
  if (value == null) return null;
  if (sourceCurrency === targetCurrency) return value;
  if (currentTrmToCop == null || currentTrmToCop <= 0) return null;
  if (sourceCurrency === "USD" && targetCurrency === "COP") return value * currentTrmToCop;
  if (sourceCurrency === "COP" && targetCurrency === "USD") return value / currentTrmToCop;
  return null;
}
